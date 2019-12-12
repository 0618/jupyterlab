/**
 * Example story for styling a button.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';
import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';
import { Button } from '@blueprintjs/core/lib/cjs/components/button/buttons';

export default {
  component: Button,
  title: 'Button'
};

export const text = () => (
  <Button onClick={action('clicked')}>Hello Button</Button>
);

export const emoji = () => (
  <Button onClick={action('clicked')}>
    <span role="img" aria-label="so cool">
      😀 😎 👍 💯
    </span>
  </Button>
);
