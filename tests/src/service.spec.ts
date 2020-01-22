import { expect } from 'chai';

import { ISessionContext } from '@jupyterlab/apputils';

import { createSessionContext } from '@jupyterlab/testutils';

import { PromiseDelegate } from '@lumino/coreutils';

import { DebuggerModel } from '../../lib/model';

import { DebuggerService } from '../../lib/service';

import { DebugSession } from '../../lib/session';

import { IDebugger } from '../../lib/tokens';

describe('Debugging support', () => {
  const service = new DebuggerService();
  let xpython: ISessionContext;
  let ipykernel: ISessionContext;

  beforeAll(async () => {
    xpython = await createSessionContext();
    xpython.kernelPreference = {
      ...xpython.kernelPreference,
      name: 'xpython'
    };
    ipykernel = await createSessionContext();
    ipykernel.kernelPreference = {
      ...ipykernel.kernelPreference,
      name: 'python3'
    };
    await Promise.all([xpython.initialize(), ipykernel.initialize()]);
    await Promise.all([
      xpython.session?.kernel?.info,
      ipykernel.session?.kernel?.info
    ]);
  });

  afterAll(async () => {
    await Promise.all([xpython.shutdown(), ipykernel.shutdown()]);
  });

  describe('#isAvailable', () => {
    it('should return true for kernels that have support for debugging', async () => {
      const enabled = await service.isAvailable(xpython.session);
      expect(enabled).to.be.true;
    });

    it('should return false for kernels that do not have support for debugging', async () => {
      const enabled = await service.isAvailable(ipykernel.session);
      expect(enabled).to.be.false;
    });
  });
});

describe('DebuggerService', () => {
  let sessionContext: ISessionContext;
  let model: DebuggerModel;
  let session: IDebugger.ISession;
  let service: IDebugger;

  beforeEach(async () => {
    sessionContext = await createSessionContext();
    sessionContext.kernelPreference = {
      ...sessionContext.kernelPreference,
      name: 'xpython'
    };
    await sessionContext.initialize();
    await sessionContext.session.kernel.info;
    session = new DebugSession({ connection: sessionContext.session });
    model = new DebuggerModel();
    service = new DebuggerService();
  });

  afterEach(async () => {
    await sessionContext.shutdown();
    session.dispose();
    (service as DebuggerService).dispose();
  });

  describe('#constructor()', () => {
    it('should create a new instance', () => {
      expect(service).to.be.an.instanceOf(DebuggerService);
    });
  });

  describe('#start()', () => {
    it('should start the service if the session is set', async () => {
      service.session = session;
      await service.start();
      expect(service.isStarted).to.equal(true);
    });

    it('should throw an error if the session is not set', async () => {
      try {
        await service.start();
      } catch (err) {
        expect(err.message).to.contain("Cannot read property 'start' of null");
      }
    });
  });

  describe('#stop()', () => {
    it('should stop the service if the session is set', async () => {
      service.session = session;
      await service.start();
      await service.stop();
      expect(service.isStarted).to.equal(false);
    });
  });

  describe('#session', () => {
    it('should emit the sessionChanged signal when setting the session', () => {
      const sessionChangedEvents: IDebugger.ISession[] = [];
      service.sessionChanged.connect((_, newSession) => {
        sessionChangedEvents.push(newSession);
      });
      service.session = session;
      expect(sessionChangedEvents.length).to.equal(1);
      expect(sessionChangedEvents[0]).to.eq(session);
    });
  });

  describe('#model', () => {
    it('should emit the modelChanged signal when setting the model', () => {
      const modelChangedEvents: DebuggerModel[] = [];
      service.modelChanged.connect((_, newModel) => {
        modelChangedEvents.push(newModel as DebuggerModel);
      });
      service.model = model;
      expect(modelChangedEvents.length).to.equal(1);
      expect(modelChangedEvents[0]).to.eq(model);
    });
  });

  describe('protocol', () => {
    const code = [
      'i = 0',
      'i += 1',
      'i += 1',
      'j = i**2',
      'j += 1',
      'print(i, j)'
    ].join('\n');

    let breakpoints: IDebugger.IBreakpoint[];
    let sourceId: string;

    beforeEach(async () => {
      service.session = session;
      service.model = model;
      await service.restoreState(true);
      const breakpointLines: number[] = [3, 5];
      sourceId = service.getCodeId(code);
      breakpoints = breakpointLines.map((l: number, index: number) => {
        return {
          id: index,
          line: l,
          active: true,
          verified: true,
          source: {
            path: sourceId
          }
        };
      });
      await service.updateBreakpoints(code, breakpoints);
    });

    describe('#updateBreakpoints', () => {
      it('should update the breakpoints', () => {
        const bpList = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList).to.deep.eq(breakpoints);
      });
    });

    describe('#restoreState', () => {
      it('should restore the breakpoints', async () => {
        model.breakpoints.restoreBreakpoints(
          new Map<string, IDebugger.IBreakpoint[]>()
        );
        const bpList1 = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList1.length).to.equal(0);
        await service.restoreState(true);
        const bpList2 = model.breakpoints.getBreakpoints(sourceId);
        expect(bpList2).to.deep.eq(breakpoints);
      });
    });

    describe('#restart', () => {
      it('should restart the debugger and send the breakpoints again', async () => {
        await service.restart();
        model.breakpoints.restoreBreakpoints(
          new Map<string, IDebugger.IBreakpoint[]>()
        );
        await service.restoreState(true);
        const bpList = model.breakpoints.getBreakpoints(sourceId);
        breakpoints[0].id = 2;
        breakpoints[1].id = 3;
        expect(bpList).to.deep.eq(breakpoints);
      });
    });

    describe('#hasStoppedThreads', () => {
      it('should return false if the model is null', () => {
        service.model = null;
        const hasStoppedThreads = service.hasStoppedThreads();
        expect(hasStoppedThreads).to.be.false;
      });

      it('should return true when the execution has stopped', async () => {
        const variablesChanged = new PromiseDelegate<void>();
        model.variables.changed.connect(() => {
          variablesChanged.resolve();
        });

        // trigger a manual execute request
        sessionContext.session.kernel.requestExecute({ code });

        // wait for the first stopped event and variables changed
        await variablesChanged.promise;

        const hasStoppedThreads = service.hasStoppedThreads();
        expect(hasStoppedThreads).to.be.true;
        await service.restart();
      });
    });
  });
});
