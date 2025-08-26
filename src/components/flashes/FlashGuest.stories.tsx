/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FlashGuest } from './FlashGuest';

const meta = {
  title: 'Datalayer/Flashes/FlashGuest',
  component: FlashGuest,
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
            useIAMStore: () => ({
              user: { id: '1', name: 'Guest User', roles: ['guest'] },
              logout: () => {
                console.log('Logging out user');
              },
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useNavigate: () => (path: string) => {
              console.log('Navigate to:', path);
            },
            useAuthorization: () => ({
              checkIsPlatformMember: (user: any) => false,
            }),
          },
        },
        {
          path: '../../routes',
          default: {
            CONTACT_ROUTE: '/support/contact',
          },
        },
      ],
    },
  },
} satisfies Meta<typeof FlashGuest>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WhiteLabel: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: { whiteLabel: true },
            }),
            useIAMStore: () => ({
              user: { id: '1', name: 'Guest User', roles: ['guest'] },
              logout: () => {
                console.log('Logging out user');
              },
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useNavigate: () => (path: string) => {
              console.log('Navigate to:', path);
            },
            useAuthorization: () => ({
              checkIsPlatformMember: (user: any) => false,
            }),
          },
        },
        {
          path: '../../routes',
          default: {
            CONTACT_ROUTE: '/support/contact',
          },
        },
      ],
    },
  },
};

export const PlatformMemberHidden: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: { whiteLabel: false },
            }),
            useIAMStore: () => ({
              user: { id: '1', name: 'Platform User', roles: ['member'] },
              logout: () => {
                console.log('Logging out user');
              },
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useNavigate: () => (path: string) => {
              console.log('Navigate to:', path);
            },
            useAuthorization: () => ({
              checkIsPlatformMember: (user: any) => true,
            }),
          },
        },
        {
          path: '../../routes',
          default: {
            CONTACT_ROUTE: '/support/contact',
          },
        },
      ],
    },
  },
};
