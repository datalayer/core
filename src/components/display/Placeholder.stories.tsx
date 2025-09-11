/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Placeholder } from './Placeholder';

const meta = {
  title: 'Datalayer/Display/Placeholder',
  component: Placeholder,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Placeholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
