/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PlayIcon, StopIcon, SyncIcon } from '@primer/octicons-react';

import { LongActionButton } from './LongActionButton';

const meta = {
  title: 'Datalayer/Buttons/LongActionButton',
  component: LongActionButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof LongActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Run Action',
    icon: PlayIcon,
    onClick: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

export const WithCustomIcon: Story = {
  args: {
    label: 'Sync Data',
    icon: SyncIcon,
    onClick: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Action',
    icon: StopIcon,
    disabled: true,
    onClick: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

export const ForcedProgress: Story = {
  args: {
    label: 'Processing',
    icon: PlayIcon,
    inProgress: true,
    onClick: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

export const LongRunning: Story = {
  args: {
    label: 'Long Process',
    icon: PlayIcon,
    onClick: async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
    },
  },
};
