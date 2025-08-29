/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConfettiSuccess } from './ConfettiSuccess';

const meta = {
  title: 'Datalayer/Confetti/ConfettiSuccess',
  component: ConfettiSuccess,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ConfettiSuccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
