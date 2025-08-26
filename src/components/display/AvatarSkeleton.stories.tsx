/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AvatarSkeleton } from './AvatarSkeleton';

const meta = {
  title: 'Datalayer/Display/AvatarSkeleton',
  component: AvatarSkeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'number',
      description: 'Size of the avatar skeleton',
    },
  },
} satisfies Meta<typeof AvatarSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 24,
  },
};

export const Medium: Story = {
  args: {
    size: 48,
  },
};

export const Large: Story = {
  args: {
    size: 72,
  },
};
