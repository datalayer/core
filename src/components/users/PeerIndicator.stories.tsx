/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { PeersIndicator } from './PeerIndicator';

// Mock Awareness for Storybook
const mockAwareness = {
  getStates: () => new Map(),
  on: () => {},
  off: () => {},
};

const meta = {
  title: 'Datalayer/Users/PeersIndicator',
  component: PeersIndicator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../utils',
          default: {
            getAvatarURL: (url: string) => url,
            getRelativeTime: (date: Date) => '2 minutes ago',
          },
        },
      ],
    },
  },
} satisfies Meta<typeof PeersIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoPeers: Story = {
  args: {
    awareness: mockAwareness,
    currentUserHandle: 'currentuser',
  },
};

export const WithPeers: Story = {
  args: {
    awareness: {
      getStates: () =>
        new Map([
          [
            1,
            {
              user: {
                name: 'alice',
                display_name: 'Alice Smith',
                username: 'alice',
                color: '#ff6b6b',
                initials: 'AS',
                avatar_url: 'https://github.com/alice.png',
              },
            },
          ],
          [
            2,
            {
              user: {
                name: 'bob',
                display_name: 'Bob Johnson',
                username: 'bob',
                color: '#4ecdc4',
                initials: 'BJ',
                avatar_url: 'https://github.com/bob.png',
              },
            },
          ],
        ]),
      on: () => {},
      off: () => {},
    } as any,
    currentUserHandle: 'currentuser',
  },
};

export const WithAgent: Story = {
  args: {
    awareness: {
      getStates: () =>
        new Map([
          [
            1,
            {
              user: {
                name: 'alice',
                display_name: 'Alice Smith',
                username: 'alice',
                color: '#ff6b6b',
                initials: 'AS',
                avatar_url: 'https://github.com/alice.png',
              },
            },
          ],
          [
            2,
            {
              user: {
                name: 'ai-agent',
                agent: 'Claude Assistant',
                color: '#9b59b6',
              },
              notification: {
                message: 'Processing your request...',
                timestamp: Date.now(),
                message_type: 0,
              },
            },
          ],
        ]),
      on: () => {},
      off: () => {},
    } as any,
    currentUserHandle: 'currentuser',
  },
};
