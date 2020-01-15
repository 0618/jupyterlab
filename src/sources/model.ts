// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { CallstackModel } from '../callstack/model';

import { IDebugger } from '../tokens';

/**
 * The model to keep track of the current source being displayed.
 */
export class SourcesModel {
  /**
   * Instantiate a new Sources.Model
   * @param options The Sources.Model instantiation options.
   */
  constructor(options: SourcesModel.IOptions) {
    this.currentFrameChanged = options.currentFrameChanged;
  }

  /**
   * Signal emitted when the current frame changes.
   */
  currentFrameChanged: ISignal<CallstackModel, CallstackModel.IFrame>;

  /**
   * Signal emitted when a source should be open in the main area.
   */
  get currentSourceOpened(): ISignal<SourcesModel, IDebugger.ISource> {
    return this._currentSourceOpened;
  }

  /**
   * Signal emitted when the current source changes.
   */
  get currentSourceChanged(): ISignal<SourcesModel, IDebugger.ISource> {
    return this._currentSourceChanged;
  }

  /**
   * Return the current source.
   */
  get currentSource() {
    return this._currentSource;
  }

  /**
   * Set the current source.
   * @param source The source to set as the current source.
   */
  set currentSource(source: IDebugger.ISource | null) {
    this._currentSource = source;
    this._currentSourceChanged.emit(source);
  }

  /**
   * Open a source in the main area.
   */
  open() {
    this._currentSourceOpened.emit(this._currentSource);
  }

  private _currentSource: IDebugger.ISource | null;
  private _currentSourceOpened = new Signal<SourcesModel, IDebugger.ISource>(
    this
  );
  private _currentSourceChanged = new Signal<SourcesModel, IDebugger.ISource>(
    this
  );
}

/**
 * A namespace for SourcesModel `statics`.
 */
export namespace SourcesModel {
  /**
   * The options used to initialize a SourcesModel object.
   */
  export interface IOptions {
    /**
     * Signal emitted when the current frame changes.
     */
    currentFrameChanged: ISignal<CallstackModel, CallstackModel.IFrame>;
  }
}
