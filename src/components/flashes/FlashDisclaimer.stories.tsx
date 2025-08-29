/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FlashDisclaimer } from './FlashDisclaimer';

const meta = {
  title: 'Datalayer/Flashes/FlashDisclaimer',
  component: FlashDisclaimer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: { whiteLabel: false },
            }),
            useRuntimesStore: () => ({
              showDisclaimer: true,
              setShowDisclaimer: (show: boolean) => {
                console.log('Setting disclaimer visibility:', show);
              },
            }),
          },
        },
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
} satisfies Meta<typeof FlashDisclaimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WhiteLabelHidden: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: { whiteLabel: true },
            }),
            useRuntimesStore: () => ({
              showDisclaimer: true,
              setShowDisclaimer: (show: boolean) => {
                console.log('Setting disclaimer visibility:', show);
              },
            }),
          },
        },
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
};

export const DisclaimerHidden: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: { whiteLabel: false },
            }),
            useRuntimesStore: () => ({
              showDisclaimer: false,
              setShowDisclaimer: (show: boolean) => {
                console.log('Setting disclaimer visibility:', show);
              },
            }),
          },
        },
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
};
