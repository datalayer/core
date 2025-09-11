/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Timer } from './Timer';

const meta = {
  title: 'Datalayer/Progress/Timer',
  component: Timer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    duration: {
      control: { type: 'number', min: 0 },
      description: 'Timer duration in seconds',
    },
  },
} satisfies Meta<typeof Timer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    duration: 30,
  },
};

export const ShortTimer: Story = {
  args: {
    duration: 10,
  },
};

export const LongTimer: Story = {
  args: {
    duration: 300,
  },
};
