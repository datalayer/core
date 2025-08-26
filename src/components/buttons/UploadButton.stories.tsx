/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { UploadButton, UploadIconButton } from './UploadButton';

const meta = {
  title: 'Datalayer/Buttons/UploadButton',
  component: UploadButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'invisible', 'danger', 'link'],
    },
    upload: { action: 'file uploaded' },
  },
  args: {
    upload: fn().mockResolvedValue(undefined),
  },
} satisfies Meta<typeof UploadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Upload File',
    variant: 'primary',
    multiple: false,
  },
};

export const Multiple: Story = {
  args: {
    label: 'Upload Files',
    variant: 'default',
    multiple: true,
  },
};

export const Primary: Story = {
  args: {
    label: 'Upload Document',
    variant: 'primary',
    multiple: false,
  },
};

export const Invisible: Story = {
  args: {
    label: 'Upload',
    variant: 'invisible',
    multiple: false,
  },
};

// Icon button variant
const iconMeta = {
  ...meta,
  title: 'Datalayer/Buttons/UploadIconButton',
  component: UploadIconButton,
} satisfies Meta<typeof UploadIconButton>;

export const IconButton: StoryObj<typeof iconMeta> = {
  args: {
    label: 'Upload file',
    multiple: false,
  },
};

export const IconButtonMultiple: StoryObj<typeof iconMeta> = {
  args: {
    label: 'Upload files',
    multiple: true,
  },
};
