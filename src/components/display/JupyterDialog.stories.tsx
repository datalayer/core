/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { createElement } from 'react';
import { Dialog } from '@jupyterlab/apputils';

import { JupyterDialog } from './JupyterDialog';

const meta = {
  title: 'Datalayer/Display/JupyterDialog',
  component: JupyterDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Dialog title',
    },
  },
} satisfies Meta<typeof JupyterDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple body component for stories
const SimpleBody = ({
  setValue,
}: {
  setValue: (v: string | Error) => void;
}) => {
  return createElement('div', {}, 'This is a simple dialog body');
};

// Form body component for stories
const FormBody = ({ setValue }: { setValue: (v: string | Error) => void }) => {
  return createElement('div', {
    children: [
      createElement('p', { key: 'text' }, 'Please enter some text:'),
      createElement('input', {
        key: 'input',
        type: 'text',
        placeholder: 'Enter text here...',
        onChange: (e: any) => setValue(e.target.value),
        style: { width: '100%', padding: '8px', marginTop: '8px' },
      }),
    ],
  });
};

export const Default: Story = {
  render: () => {
    const dialog = new JupyterDialog({
      title: 'Sample Dialog',
      body: SimpleBody,
      buttons: [Dialog.cancelButton(), Dialog.okButton()],
      checkbox: null,
      host: document.body,
    });

    // For Storybook, we'll render the component directly
    return dialog.render();
  },
};

export const WithCheckbox: Story = {
  render: () => {
    const dialog = new JupyterDialog({
      title: 'Dialog with Checkbox',
      body: SimpleBody,
      buttons: [Dialog.cancelButton(), Dialog.okButton()],
      checkbox: {
        label: 'Remember my choice',
        caption: 'This will save your preference',
        checked: false,
      },
      host: document.body,
    });

    return dialog.render();
  },
};

export const WithForm: Story = {
  render: () => {
    const dialog = new JupyterDialog({
      title: 'Input Dialog',
      body: FormBody,
      buttons: [Dialog.cancelButton(), Dialog.okButton()],
      checkbox: null,
      host: document.body,
    });

    return dialog.render();
  },
};

export const DangerButton: Story = {
  render: () => {
    const dialog = new JupyterDialog({
      title: 'Confirm Action',
      body: ({ setValue }) =>
        createElement('div', {}, 'This action cannot be undone. Are you sure?'),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: 'Delete', accept: true }),
      ],
      checkbox: null,
      host: document.body,
    });

    return dialog.render();
  },
};
