/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { HorizontalCenter } from './HorizontalCenter';

const meta = {
  title: 'Datalayer/Display/HorizontalCenter',
  component: HorizontalCenter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    margin: {
      control: 'text',
      description: 'CSS margin value',
    },
  },
} satisfies Meta<typeof HorizontalCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div style={{ padding: '20px', background: '#f0f0f0' }}>
        Centered Content
      </div>
    ),
  },
};

export const WithMargin: Story = {
  args: {
    margin: '20px',
    children: (
      <div style={{ padding: '20px', background: '#e8f4f8' }}>
        Content with margin
      </div>
    ),
  },
};

export const MultipleElements: Story = {
  args: {
    margin: '10px',
    children: (
      <>
        <div
          style={{
            padding: '10px',
            background: '#ffe6e6',
            marginRight: '10px',
          }}
        >
          Element 1
        </div>
        <div
          style={{
            padding: '10px',
            background: '#e6ffe6',
            marginRight: '10px',
          }}
        >
          Element 2
        </div>
        <div style={{ padding: '10px', background: '#e6e6ff' }}>Element 3</div>
      </>
    ),
  },
};
