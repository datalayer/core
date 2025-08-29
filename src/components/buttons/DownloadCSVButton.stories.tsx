/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DownloadCSVButton } from './DownloadCSVButton';

const meta = {
  title: 'Datalayer/Buttons/DownloadCSVButton',
  component: DownloadCSVButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'invisible', 'danger', 'link'],
    },
  },
} satisfies Meta<typeof DownloadCSVButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = {
  users: [
    { name: 'Alice', age: 30, email: 'alice@example.com' },
    { name: 'Bob', age: 25, email: 'bob@example.com' },
    { name: 'Charlie', age: 35, email: 'charlie@example.com' },
  ],
};

export const Default: Story = {
  args: {
    data: sampleData,
    fileName: 'sample-data',
    variant: 'default',
  },
};

export const Primary: Story = {
  args: {
    data: sampleData,
    fileName: 'sample-data',
    variant: 'primary',
  },
};

export const Danger: Story = {
  args: {
    data: sampleData,
    fileName: 'sample-data',
    variant: 'danger',
  },
};

export const NoData: Story = {
  args: {
    fileName: 'empty-data',
    variant: 'default',
  },
};
