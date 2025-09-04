/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsumptionBar } from './ConsumptionBar';

const meta = {
  title: 'Datalayer/Progress/ConsumptionBar',
  component: ConsumptionBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    burningRate: {
      control: { type: 'number', min: 0, step: 0.1 },
      description: 'Credits burning rate per second',
    },
    startedAt: {
      control: { type: 'number' },
      description: 'Start timestamp (Unix seconds)',
    },
    expiredAt: {
      control: { type: 'number' },
      description: 'Expiration timestamp (Unix seconds)',
    },
  },
} satisfies Meta<typeof ConsumptionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now() / 1000;
const startTime = now - 300; // 5 minutes ago
const endTime = now + 300; // 5 minutes from now

export const Default: Story = {
  args: {
    burningRate: 0.1,
    startedAt: startTime,
    expiredAt: endTime,
  },
};

export const WarningLevel: Story = {
  args: {
    burningRate: 0.1,
    startedAt: now - 450,
    expiredAt: now + 150,
  },
};

export const CriticalLevel: Story = {
  args: {
    burningRate: 0.1,
    startedAt: now - 540,
    expiredAt: now + 60,
  },
};

export const NoExpiration: Story = {
  args: {
    burningRate: 0.1,
    startedAt: startTime,
  },
};

export const WithCallback: Story = {
  args: {
    burningRate: 0.1,
    startedAt: startTime,
    expiredAt: endTime,
    onClick: () => console.log('Consumption bar clicked'),
    onUpdate: (progress, duration) =>
      console.log('Progress:', progress, 'Duration:', duration),
  },
};
