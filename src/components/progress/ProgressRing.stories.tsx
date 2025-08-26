/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressRing } from './ProgressRing';

const meta = {
  title: 'Datalayer/Progress/ProgressRing',
  component: ProgressRing,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value (0-100)',
    },
    color: {
      control: 'color',
      description: 'Color of the progress ring',
    },
    title: {
      control: 'text',
      description: 'Accessible title for the progress ring',
    },
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    progress: 75,
    title: 'Loading progress',
  },
};

export const Empty: Story = {
  args: {
    progress: 0,
    title: 'Not started',
  },
};

export const Complete: Story = {
  args: {
    progress: 100,
    title: 'Complete',
  },
};

export const CustomColor: Story = {
  args: {
    progress: 60,
    color: '#ff6b6b',
    title: 'Custom colored progress',
  },
};

export const MultipleRings: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ width: '32px', height: '32px' }}>
        <ProgressRing progress={25} title="Quarter" />
      </div>
      <div style={{ width: '32px', height: '32px' }}>
        <ProgressRing progress={50} title="Half" />
      </div>
      <div style={{ width: '32px', height: '32px' }}>
        <ProgressRing progress={75} title="Three quarters" />
      </div>
      <div style={{ width: '32px', height: '32px' }}>
        <ProgressRing progress={100} title="Complete" />
      </div>
    </div>
  ),
};
