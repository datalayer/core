/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BoringAvatar } from './BoringAvatar';

const meta = {
  title: 'Datalayer/BoringAvatar',
  component: BoringAvatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BoringAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleAvatar: Story = {
  args: {
    displayName: 'Jane Doe',
    variant: 'bauhaus',
    size: 40,
    square: false,
    style: {},
  },
};
