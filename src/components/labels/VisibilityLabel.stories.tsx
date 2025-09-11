/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { VisibilityLabel } from './VisibilityLabel';

const meta = {
  title: 'Datalayer/Labels/VisibilityLabel',
  component: VisibilityLabel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isPublic: {
      control: { type: 'select' },
      options: [true, false, undefined],
      description: 'Whether the item is public, private, or undefined',
    },
  },
} satisfies Meta<typeof VisibilityLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Public: Story = {
  args: {
    isPublic: true,
  },
};

export const Private: Story = {
  args: {
    isPublic: false,
  },
};

export const Undefined: Story = {
  args: {
    isPublic: undefined,
  },
};
