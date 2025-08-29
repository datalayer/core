/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { CreditsIndicator } from './CreditsIndicator';
import type { IRuntimeModel } from '../../models';

// Mock runtime models
const mockRuntimeModels: { [key: string]: IRuntimeModel } = {
  'kernel-1': {
    id: 'kernel-1',
    name: 'python3',
    pod_name: 'runtime-pod-1',
    ingress: 'https://runtime1.example.com',
    given_name: 'My Python Kernel',
    type: 'notebook',
    token: 'mock-token-1',
    burning_rate: 0.5, // 0.5 credits per second
    started_at: (Date.now() - 1800000).toString(), // Started 30 minutes ago
    expired_at: (Date.now() + 1800000).toString(), // Expires in 30 minutes
    reservation_id: 'reservation-1',
    last_activity: new Date().toISOString(),
    execution_state: 'idle',
    connections: 1,
    reason: '',
  },
  'kernel-2': {
    id: 'kernel-2',
    name: 'python3',
    pod_name: 'runtime-pod-2',
    ingress: 'https://runtime2.example.com',
    given_name: 'Long Running Kernel',
    type: 'notebook',
    token: 'mock-token-2',
    burning_rate: 1.0, // 1.0 credits per second
    started_at: (Date.now() - 5400000).toString(), // Started 90 minutes ago
    expired_at: (Date.now() + 600000).toString(), // Expires in 10 minutes
    reservation_id: 'reservation-2',
    last_activity: new Date().toISOString(),
    execution_state: 'busy',
    connections: 2,
    reason: '',
  },
  'kernel-3': {
    id: 'kernel-3',
    name: 'python3',
    pod_name: 'runtime-pod-3',
    ingress: 'https://runtime3.example.com',
    given_name: 'Fresh Kernel',
    type: 'cell',
    token: 'mock-token-3',
    burning_rate: 0.25, // 0.25 credits per second
    started_at: (Date.now() - 300000).toString(), // Started 5 minutes ago
    expired_at: (Date.now() + 3300000).toString(), // Expires in 55 minutes
    reservation_id: 'reservation-3',
    last_activity: new Date().toISOString(),
    execution_state: 'idle',
    connections: 1,
    reason: '',
  },
};

// Mock service manager
const createMockServiceManager = () => ({
  runtimesManager: {
    findById: async (kernelId: string) => {
      // Simulate async call
      await new Promise(resolve => setTimeout(resolve, 100));
      return mockRuntimeModels[kernelId];
    },
  },
});

const meta = {
  title: 'Datalayer/Progress/CreditsIndicator',
  component: CreditsIndicator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, display, style, ...props }) => (
              <div
                {...props}
                style={{
                  ...style,
                  ...(display && { display }),
                }}
              >
                {children}
              </div>
            ),
          },
        },
        {
          path: '../../components/progress',
          default: {
            ConsumptionBar: ({
              startedAt,
              expiredAt,
              burningRate,
              onClick,
              onUpdate,
              style,
            }) => (
              <div
                style={{
                  width: 200,
                  height: 8,
                  background: '#f0f0f0',
                  borderRadius: 4,
                  position: 'relative',
                  cursor: 'pointer',
                  ...style,
                }}
                onClick={onClick}
              >
                <div
                  style={{
                    width: `${Math.max(10, Math.min(90, ((Date.now() - startedAt) / (expiredAt - startedAt)) * 100))}%`,
                    height: '100%',
                    background:
                      burningRate > 0.7
                        ? '#d73a49'
                        : burningRate > 0.3
                          ? '#f66a0a'
                          : '#28a745',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {burningRate}/s credits
                </span>
              </div>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    kernelId: {
      control: 'select',
      options: ['kernel-1', 'kernel-2', 'kernel-3'],
      description: 'Kernel ID to track credits for',
    },
    onClick: {
      action: 'clicked',
      description: 'Callback when progress bar is clicked',
    },
    onUpdate: {
      action: 'updated',
      description: 'Callback when progress is updated',
    },
  },
} satisfies Meta<typeof CreditsIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    serviceManager: createMockServiceManager(),
    kernelId: 'kernel-1',
    onClick: () => console.log('Credits indicator clicked'),
    onUpdate: (progress, duration) =>
      console.log('Progress:', progress, 'Duration:', duration),
  },
};

export const HighBurningRate: Story = {
  args: {
    serviceManager: createMockServiceManager(),
    kernelId: 'kernel-2',
    onClick: () => console.log('High burning rate kernel clicked'),
    onUpdate: (progress, duration) =>
      console.log('High burning rate progress:', progress),
  },
};

export const LowBurningRate: Story = {
  args: {
    serviceManager: createMockServiceManager(),
    kernelId: 'kernel-3',
    onClick: () => console.log('Low burning rate kernel clicked'),
    onUpdate: (progress, duration) =>
      console.log('Low burning rate progress:', progress),
  },
};

export const WithoutCallbacks: Story = {
  args: {
    serviceManager: createMockServiceManager(),
    kernelId: 'kernel-1',
  },
};

const NonExistentKernelServiceManager = {
  runtimesManager: {
    findById: async (kernelId: string) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return undefined; // Simulate kernel not found
    },
  },
};

export const KernelNotFound: Story = {
  args: {
    serviceManager: NonExistentKernelServiceManager,
    kernelId: 'non-existent-kernel',
    onClick: () => console.log('Non-existent kernel clicked'),
  },
};
