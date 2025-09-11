/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { NotebookSkeleton } from './NotebookSkeleton';

const meta = {
  title: 'Datalayer/Display/NotebookSkeleton',
  component: NotebookSkeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof NotebookSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
