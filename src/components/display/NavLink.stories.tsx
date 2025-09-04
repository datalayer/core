/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { NavLink } from './NavLink';

const meta = {
  title: 'Datalayer/Display/NavLink',
  component: NavLink,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
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
    to: {
      control: 'text',
      description: 'Navigation target path',
    },
    children: {
      control: 'text',
      description: 'Link content',
    },
  },
} satisfies Meta<typeof NavLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    to: '/dashboard',
    children: 'Dashboard',
  },
};

export const WithIcon: Story = {
  args: {
    to: '/settings',
    children: '⚙️ Settings',
  },
};

export const LongText: Story = {
  args: {
    to: '/very-long-path-name',
    children: 'Navigate to a page with a very long name',
  },
};
