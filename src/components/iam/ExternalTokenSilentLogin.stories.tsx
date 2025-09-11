/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ExternalTokenSilentLogin } from './ExternalTokenSilentLogin';

const meta = {
  title: 'Datalayer/IAM/ExternalTokenSilentLogin',
  component: ExternalTokenSilentLogin,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useIAMStore: () => ({
              logout: () => {
                console.log('Logging out');
              },
              checkIAMToken: () => Promise.resolve({ valid: true }),
              externalToken: 'mock-external-token',
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message: string, options?: any) => {
                console.log('Toast:', message, options);
              },
            }),
            useIAM: () => ({
              loginAndNavigate: (
                token: string,
                logout: Function,
                checkToken: Function,
              ) => {
                console.log('Login and navigate with token:', token);
                return Promise.resolve();
              },
            }),
          },
        },
      ],
    },
  },
  argTypes: {
    message: {
      control: 'text',
      description: 'Message to display during login',
    },
  },
} satisfies Meta<typeof ExternalTokenSilentLogin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Logging in with external token...',
  },
};

export const WithoutExternalToken: Story = {
  args: {
    message: 'Waiting for external token...',
  },
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useIAMStore: () => ({
              logout: () => {
                console.log('Logging out');
              },
              checkIAMToken: () => Promise.resolve({ valid: true }),
              externalToken: null,
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message: string, options?: any) => {
                console.log('Toast:', message, options);
              },
            }),
            useIAM: () => ({
              loginAndNavigate: (
                token: string,
                logout: Function,
                checkToken: Function,
              ) => {
                console.log('Login and navigate with token:', token);
                return Promise.resolve();
              },
            }),
          },
        },
      ],
    },
  },
};

export const LoginError: Story = {
  args: {
    message: 'Logging in...',
  },
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useIAMStore: () => ({
              logout: () => {
                console.log('Logging out');
              },
              checkIAMToken: () => Promise.resolve({ valid: true }),
              externalToken: 'invalid-token',
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message: string, options?: any) => {
                console.log('Toast:', message, options);
              },
            }),
            useIAM: () => ({
              loginAndNavigate: (
                token: string,
                logout: Function,
                checkToken: Function,
              ) => {
                console.log('Login failed with token:', token);
                return Promise.reject(new Error('Invalid token'));
              },
            }),
          },
        },
      ],
    },
  },
};
