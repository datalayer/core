/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToTopBranded } from './ToTopBranded';

const meta = {
  title: 'Datalayer/Display/ToTopBranded',
  component: ToTopBranded,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ToTopBranded>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithScrollableContent: Story = {
  decorators: [
    Story => (
      <div>
        <div style={{ height: '200vh', padding: '20px' }}>
          <h1>Scroll down to see the "Go Top" button in action</h1>
          <p>This is some content that makes the page scrollable.</p>
          <p>The button is positioned fixed at the bottom left.</p>
          <div style={{ marginTop: '50vh' }}>
            <h2>Middle of content</h2>
            <p>More content here...</p>
          </div>
          <div style={{ marginTop: '50vh' }}>
            <h2>End of content</h2>
            <p>Try clicking the "Go Top" button to scroll back to top.</p>
          </div>
        </div>
        <Story />
      </div>
    ),
  ],
};
