/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DatalayerBox } from './DatalayerBox';

const meta = {
  title: 'Datalayer/Display/DatalayerBox',
  component: DatalayerBox,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useNavigate: () => (path: string) => {
              console.log('Navigate to:', path);
            },
          },
        },
      ],
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Title of the box',
    },
    linkLabel: {
      control: 'text',
      description: 'Label for the navigation link',
    },
    linkRoute: {
      control: 'text',
      description: 'Route for the navigation link',
    },
  },
} satisfies Meta<typeof DatalayerBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Sample Box Title',
    children: 'This is the content inside the Datalayer box component.',
  },
};

export const WithLink: Story = {
  args: {
    title: 'Notebooks',
    linkLabel: 'View All',
    linkRoute: '/notebooks',
    children: 'Here you can see your recent notebooks and create new ones.',
  },
};

export const WithComplexContent: Story = {
  args: {
    title: 'Dashboard Statistics',
    linkLabel: 'Details',
    linkRoute: '/dashboard',
    children: (
      <div>
        <p>Recent activity summary:</p>
        <ul>
          <li>5 notebooks created this week</li>
          <li>12 experiments completed</li>
          <li>3 models deployed</li>
        </ul>
      </div>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'This is a Very Long Title That Might Wrap to Multiple Lines',
    linkLabel: 'See More',
    linkRoute: '/details',
    children: 'Content for the box with a long title.',
  },
};
