/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'Datalayer/Display/VisuallyHidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    isVisible: {
      control: 'boolean',
      description: 'Whether the content should be visible',
    },
  },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This text is visually hidden but accessible to screen readers',
  },
};

export const Visible: Story = {
  args: {
    isVisible: true,
    children: 'This text is now visible',
  },
};

export const WithContext: Story = {
  render: args => (
    <div>
      <p>Here is some visible content.</p>
      <VisuallyHidden {...args}>
        This is hidden text that provides additional context for screen readers.
      </VisuallyHidden>
      <p>And here is more visible content.</p>
    </div>
  ),
  args: {
    children:
      'Screen reader only: This section contains accessibility information',
  },
};
