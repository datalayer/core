/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { CenteredSpinner } from './CenteredSpinner';

const meta = {
  title: 'Datalayer/Display/CenteredSpinner',
  component: CenteredSpinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    message: {
      control: 'text',
      description: 'Optional message to display next to spinner',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Size of the spinner',
    },
  },
} satisfies Meta<typeof CenteredSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMessage: Story = {
  args: {
    message: 'Loading data...',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    message: 'Processing...',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    message: 'Loading application...',
  },
};
