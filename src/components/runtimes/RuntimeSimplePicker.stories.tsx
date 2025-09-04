/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { RuntimeSimplePicker } from './RuntimeSimplePicker';
import type { IRuntimeAssignOptions } from './RuntimeSimplePicker';

const meta = {
  title: 'Datalayer/Runtimes/RuntimeSimplePicker',
  component: RuntimeSimplePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/jupyter-react',
          default: {
            KernelIndicator: ({ sessionConnection, status }) => (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: sessionConnection ? '#28a745' : '#6c757d',
                  }}
                />
                {status || (sessionConnection ? 'Connected' : 'Disconnected')}
              </div>
            ),
          },
        },
        {
          path: '@primer/react',
          default: {
            ActionList: {
              Item: ({ children, onClick, selected, ...props }) => (
                <div
                  {...props}
                  onClick={onClick}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: selected ? '#f1f8ff' : 'transparent',
                    borderBottom: '1px solid #d1d9e0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {children}
                </div>
              ),
            },
            ActionMenu: {
              Button: ({ children, ...props }) => (
                <button
                  {...props}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d9e0',
                    borderRadius: '6px',
                    backgroundColor: '#f6f8fa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {children}
                </button>
              ),
              Overlay: ({ children }) => (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d9e0',
                    borderRadius: '6px',
                    marginTop: '4px',
                    minWidth: '200px',
                    boxShadow: '0 8px 16px rgba(31,35,40,0.15)',
                    zIndex: 1000,
                  }}
                >
                  {children}
                </div>
              ),
            },
            Box: ({ children, ...props }) => <div {...props}>{children}</div>,
            Button: ({
              children,
              onClick,
              variant = 'primary',
              size = 'medium',
              ...props
            }) => (
              <button
                {...props}
                onClick={onClick}
                style={{
                  backgroundColor:
                    variant === 'primary' ? '#0969da' : '#f6f8fa',
                  color: variant === 'primary' ? 'white' : '#24292f',
                  border:
                    variant === 'primary'
                      ? '1px solid #0969da'
                      : '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: size === 'small' ? '4px 8px' : '8px 16px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: size === 'small' ? '12px' : '14px',
                }}
              >
                {children}
              </button>
            ),
            Tooltip: ({ children }) => <div>{children}</div>,
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            CloudIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2.75 8.5A1.25 1.25 0 014 7.25h8a1.25 1.25 0 011.25 1.25v4a1.25 1.25 0 01-1.25 1.25H4A1.25 1.25 0 012.75 12.5v-4z" />
              </svg>
            ),
            EyeIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 2c1.98 0 3.73.64 5.13 1.44a.75.75 0 01.37.88l-.5 1.5a.75.75 0 01-.37.44C11.27 7.64 9.98 8 8 8s-3.27-.36-4.63-.74a.75.75 0 01-.37-.44l-.5-1.5a.75.75 0 01.37-.88C4.27 2.64 6.02 2 8 2z" />
              </svg>
            ),
            UnfoldIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8.177.677l2.896 2.896a.25.25 0 01-.177.427H8.75v1.25a.75.75 0 01-1.5 0V4H5.104a.25.25 0 01-.177-.427L7.823.677a.25.25 0 01.354 0zM7.25 10.75a.75.75 0 011.5 0V12h2.146a.25.25 0 01.177.427l-2.896 2.896a.25.25 0 01-.354 0l-2.896-2.896A.25.25 0 015.104 12H7.25v-1.25z" />
              </svg>
            ),
          },
        },
        {
          path: '@datalayer/icons-react',
          default: {
            BrowserIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M0 2.5A1.5 1.5 0 011.5 1h13A1.5 1.5 0 0116 2.5v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 010 13.5v-11z" />
              </svg>
            ),
            PlusIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 4a.75.75 0 01.75.75v2.5h2.5a.75.75 0 010 1.5h-2.5v2.5a.75.75 0 01-1.5 0v-2.5h-2.5a.75.75 0 010-1.5h2.5v-2.5A.75.75 0 018 4z" />
              </svg>
            ),
          },
        },
        {
          path: '../../components/icons',
          default: {
            ArtifactIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M1.5 2.5A1.5 1.5 0 013 1h10a1.5 1.5 0 011.5 1.5v11a1.5 1.5 0 01-1.5 1.5H3A1.5 1.5 0 011.5 13.5v-11z" />
              </svg>
            ),
          },
        },
        {
          path: '../../components/runtimes',
          default: {
            KernelLauncherDialog: ({
              manager,
              onSubmit,
              startKernel,
              markdownParser,
              sanitizer,
            }) => (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    minWidth: '300px',
                  }}
                >
                  <h3>Mock Launcher Dialog</h3>
                  <p>Start Kernel: {String(startKernel)}</p>
                  <button onClick={() => onSubmit()}>Launch</button>
                </div>
              </div>
            ),
          },
        },
        {
          path: '../../state',
          default: {
            useRuntimesStore: () => ({
              runtimeModels: [
                {
                  id: 'runtime-1',
                  name: 'Python Runtime 1',
                  kernelId: 'python3-kernel-1',
                  status: 'running',
                  location: 'remote',
                },
                {
                  id: 'runtime-2',
                  name: 'R Runtime 1',
                  kernelId: 'ir-kernel-1',
                  status: 'idle',
                  location: 'remote',
                },
              ],
              multiServiceManager: {
                remote: {
                  environments: {
                    get: () => [
                      {
                        name: 'python3',
                        title: 'Python 3.11',
                        language: 'python',
                      },
                      { name: 'ir', title: 'R 4.3', language: 'r' },
                    ],
                  },
                },
              },
              jupyterLabAdapter: {},
            }),
          },
        },
      ],
    },
  },
  argTypes: {},
} satisfies Meta<typeof RuntimeSimplePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock session connection
const createMockSessionConnection = (connected = true) => {
  if (!connected) return undefined;

  return {
    kernel: {
      id: 'kernel-123',
      name: 'python3',
      connectionStatus: 'connected',
      status: 'idle',
    },
    statusChanged: {
      connect: () => {},
      disconnect: () => {},
    },
    connectionStatusChanged: {
      connect: () => {},
      disconnect: () => {},
    },
  };
};

export const Default: Story = {
  args: {
    assignRuntime: async (options: IRuntimeAssignOptions) => {
      console.log('Runtime assigned:', options);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    sessionConnection: createMockSessionConnection(false),
  },
};

export const WithActiveSession: Story = {
  args: {
    assignRuntime: async (options: IRuntimeAssignOptions) => {
      console.log('Runtime assigned:', options);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    sessionConnection: createMockSessionConnection(true),
  },
};

export const WithBusyKernel: Story = {
  args: {
    assignRuntime: async (options: IRuntimeAssignOptions) => {
      console.log('Runtime assigned:', options);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    sessionConnection: {
      ...createMockSessionConnection(true),
      kernel: {
        ...createMockSessionConnection(true)?.kernel,
        status: 'busy',
      },
    },
  },
};

export const DisconnectedKernel: Story = {
  args: {
    assignRuntime: async (options: IRuntimeAssignOptions) => {
      console.log('Runtime assigned:', options);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    sessionConnection: {
      ...createMockSessionConnection(true),
      kernel: {
        ...createMockSessionConnection(true)?.kernel,
        connectionStatus: 'disconnected',
        status: 'dead',
      },
    },
  },
};
