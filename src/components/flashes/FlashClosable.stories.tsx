/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FlashClosable } from './FlashClosable';
import { Button } from '@primer/react';

const meta = {
  title: 'Datalayer/Flashes/FlashClosable',
  component: FlashClosable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger'],
      description: 'Flash variant/theme',
    },
    closable: {
      control: 'boolean',
      description: 'Whether the flash can be closed',
    },
  },
} satisfies Meta<typeof FlashClosable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a default flash message that can be closed.',
    closable: true,
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Operation completed successfully!',
    closable: true,
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Please be aware of this important warning message.',
    closable: true,
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'An error has occurred. Please check your input and try again.',
    closable: true,
  },
};

export const NotClosable: Story = {
  args: {
    variant: 'warning',
    children: 'This flash message cannot be closed by the user.',
    closable: false,
  },
};

export const WithActions: Story = {
  args: {
    variant: 'warning',
    children: 'Would you like to save your changes before continuing?',
    closable: true,
    actions: (
      <>
        <Button size="small" variant="primary">
          Save
        </Button>
        <Button size="small" variant="default">
          Discard
        </Button>
      </>
    ),
  },
};

export const LongMessage: Story = {
  args: {
    variant: 'default',
    children:
      'This is a very long flash message that demonstrates how the component handles extended content. It might wrap to multiple lines depending on the available width, and the close button should remain properly positioned.',
    closable: true,
  },
};
