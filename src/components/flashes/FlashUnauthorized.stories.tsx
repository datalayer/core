/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FlashUnauthorized } from './FlashUnauthorized';

const meta = {
  title: 'Datalayer/Flashes/FlashUnauthorized',
  component: FlashUnauthorized,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useNavigate: () => (path: string, e?: Event) => {
              console.log('Navigate to:', path);
            },
          },
        },
      ],
    },
  },
} satisfies Meta<typeof FlashUnauthorized>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
