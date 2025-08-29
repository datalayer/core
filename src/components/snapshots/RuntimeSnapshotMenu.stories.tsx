/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { RuntimeSnapshotMenu } from './RuntimeSnapshotMenu';

// Mock data
const mockSnapshots = [
  {
    id: 'snapshot-1',
    name: 'Data Analysis Session',
    description: 'Snapshot with loaded datasets and models',
    createdAt: '2024-01-15T10:30:00Z',
    size: 1024 * 1024 * 5, // 5MB
  },
  {
    id: 'snapshot-2',
    name: 'ML Training Complete',
    description: 'Trained model and evaluation results',
    createdAt: '2024-01-14T16:45:00Z',
    size: 1024 * 1024 * 12, // 12MB
  },
  {
    id: 'snapshot-3',
    name: 'Feature Engineering',
    description: 'Processed features and transformers',
    createdAt: '2024-01-13T09:15:00Z',
    size: 1024 * 1024 * 8, // 8MB
  },
];

const mockConnection = {
  model: {
    id: 'kernel-123',
    name: 'python3',
    last_activity: '2024-01-15T11:00:00Z',
    execution_state: 'idle',
    connections: 1,
  },
  dispose: () => {},
  isDisposed: false,
};

const mockMultiServiceManager = {
  browser: {
    kernels: {
      connectTo: model => ({
        model,
        dispose: () => {},
        isDisposed: false,
      }),
    },
  },
  remote: {
    runtimesManager: {
      snapshot: async ({ podName, name, description, stop }) => {
        console.log('Creating snapshot:', { podName, name, description, stop });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          id: `snapshot-${Date.now()}`,
          name,
          description,
          createdAt: new Date().toISOString(),
          size: Math.random() * 10 * 1024 * 1024,
        };
      },
    },
  },
};

const meta = {
  title: 'Datalayer/Snapshots/RuntimeSnapshotMenu',
  component: RuntimeSnapshotMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/icons-react',
          default: {
            CameraIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4.75 0A.75.75 0 015.5.75v1h5v-1A.75.75 0 0112 1.75h1a.75.75 0 010 1.5h-1v1.5A2.75 2.75 0 019.25 7.5H6.75A2.75 2.75 0 014 4.75V3.25h-1a.75.75 0 010-1.5h1.75zm5.5 3v1.5c0 .69-.56 1.25-1.25 1.25H6.75C6.06 5.75 5.5 5.19 5.5 4.5V3h4.25zM8 9a4 4 0 100 8 4 4 0 000-8zM6.5 13a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
              </svg>
            ),
          },
        },
        {
          path: '@primer/react',
          default: {
            ActionList: ({ children }) => (
              <div
                style={{
                  background: 'white',
                  border: '1px solid #d1d9e0',
                  borderRadius: '8px',
                  padding: '8px 0',
                  minWidth: '200px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              >
                {children}
              </div>
            ),
            'ActionList.Item': ({ children, onSelect, disabled }) => (
              <div
                style={{
                  padding: '8px 16px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  borderRadius: '4px',
                  margin: '0 8px',
                  backgroundColor: 'transparent',
                }}
                onClick={disabled ? undefined : onSelect}
                onMouseEnter={e => {
                  if (!disabled) e.target.style.backgroundColor = '#f6f8fa';
                }}
                onMouseLeave={e => {
                  if (!disabled) e.target.style.backgroundColor = 'transparent';
                }}
              >
                {children}
              </div>
            ),
            ActionMenu: ({ children }) => <div>{children}</div>,
            'ActionMenu.Button': ({
              children,
              leadingVisual: Icon,
              variant,
              size,
              disabled,
              onClick,
            }) => (
              <button
                onClick={onClick}
                disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: size === 'small' ? '6px 12px' : '8px 16px',
                  background:
                    variant === 'invisible' ? 'transparent' : '#f6f8fa',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {Icon && <Icon size={16} />}
                {children}
              </button>
            ),
            'ActionMenu.Overlay': ({ children }) => (
              <div style={{ position: 'relative', marginTop: '8px' }}>
                {children}
              </div>
            ),
            Box: ({ children, as = 'div', ...props }) => {
              const Component = as;
              return <Component {...props}>{children}</Component>;
            },
            Flash: ({ children, variant }) => (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: variant === 'danger' ? '#ffeef0' : '#e1f5fe',
                  border: `1px solid ${variant === 'danger' ? '#d73a49' : '#0366d6'}`,
                  color: variant === 'danger' ? '#d73a49' : '#0366d6',
                  marginTop: '8px',
                }}
              >
                {children}
              </div>
            ),
            FormControl: ({ children }) => (
              <div style={{ marginBottom: '16px' }}>{children}</div>
            ),
            'FormControl.Label': ({ children }) => (
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                {children}
              </label>
            ),
            Select: ({ children, name, value, onChange, block }) => (
              <select
                name={name}
                value={value}
                onChange={onChange}
                style={{
                  width: block ? '100%' : 'auto',
                  padding: '8px 12px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {children}
              </select>
            ),
            'Select.Option': ({ children, value }) => (
              <option value={value}>{children}</option>
            ),
            Spinner: ({ size }) => (
              <div
                style={{
                  width: size === 'small' ? '16px' : '24px',
                  height: size === 'small' ? '16px' : '24px',
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid #0366d6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ),
          },
        },
        {
          path: '@primer/react/experimental',
          default: {
            Dialog: ({ children, title, onClose, footerButtons }) => (
              <div
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'white',
                  border: '1px solid #d1d9e0',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  padding: '24px',
                  minWidth: '400px',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{title}</h2>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ marginBottom: '16px' }}>{children}</div>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                  }}
                >
                  {footerButtons?.map((button, index) => (
                    <button
                      key={index}
                      onClick={button.onClick}
                      disabled={button.disabled}
                      autoFocus={button.autoFocus}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #d1d9e0',
                        borderRadius: '6px',
                        cursor: button.disabled ? 'not-allowed' : 'pointer',
                        backgroundColor:
                          button.buttonType === 'primary' ? '#0366d6' : 'white',
                        color:
                          button.buttonType === 'primary' ? 'white' : '#24292f',
                        opacity: button.disabled ? 0.6 : 1,
                      }}
                    >
                      {button.content}
                    </button>
                  ))}
                </div>
              </div>
            ),
          },
        },
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              trackAsyncTask: (task, options) => {
                console.log('Tracking async task:', options);
                return task;
              },
            }),
          },
        },
        {
          path: '../../api',
          default: {
            createRuntimeSnapshot: async ({
              connection,
              metadata,
              onUploadProgress,
            }) => {
              console.log('Creating runtime snapshot:', {
                connection,
                metadata,
              });
              if (onUploadProgress) {
                setTimeout(onUploadProgress, 500);
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
              return {
                id: `snapshot-browser-${Date.now()}`,
                name: metadata.filename.replace('.data', ''),
                description: 'Browser runtime snapshot',
                createdAt: new Date().toISOString(),
                size: Math.random() * 5 * 1024 * 1024,
              };
            },
            getRuntimeSnapshots: async () => {
              await new Promise(resolve => setTimeout(resolve, 300));
              return mockSnapshots;
            },
            loadBrowserRuntimeSnapshot: async ({ connection, id }) => {
              console.log('Loading browser runtime snapshot:', {
                connection,
                id,
              });
              await new Promise(resolve => setTimeout(resolve, 1000));
            },
            loadRuntimeSnapshot: async ({ id, from }) => {
              console.log('Loading runtime snapshot:', { id, from });
              await new Promise(resolve => setTimeout(resolve, 1000));
            },
          },
        },
        {
          path: '../../state',
          default: {
            useRuntimesStore: () => ({
              addRuntimeSnapshot: snapshot => {
                console.log('Adding runtime snapshot:', snapshot);
              },
              runtimesRunUrl: 'https://example.com',
              runtimeSnapshots: mockSnapshots,
              setRuntimeSnapshots: snapshots => {
                console.log('Setting runtime snapshots:', snapshots);
              },
            }),
          },
        },
        {
          path: '../../utils',
          default: {
            createRuntimeSnapshotName: type => `${type}-snapshot-${Date.now()}`,
          },
        },
      ],
    },
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the menu is disabled',
    },
    podName: {
      control: 'text',
      description: 'Pod name for remote kernels',
    },
  },
} satisfies Meta<typeof RuntimeSnapshotMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    disabled: false,
    children: 'Snapshot',
  },
};

export const WithBrowserKernel: Story = {
  args: {
    disabled: false,
    connection: mockConnection,
    multiServiceManager: mockMultiServiceManager,
    children: 'Browser Snapshot',
  },
};

export const WithRemoteKernel: Story = {
  args: {
    disabled: false,
    podName: 'runtime-pod-12345',
    multiServiceManager: mockMultiServiceManager,
    children: 'Remote Snapshot',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Snapshot',
  },
};

export const LoadingState: Story = {
  args: {
    disabled: false,
    connection: mockConnection,
    multiServiceManager: mockMultiServiceManager,
    children: 'Taking Snapshot...',
  },
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useRuntimesStore: () => ({
              addRuntimeSnapshot: snapshot => {
                console.log('Adding runtime snapshot:', snapshot);
              },
              runtimesRunUrl: 'https://example.com',
              runtimeSnapshots: mockSnapshots,
              setRuntimeSnapshots: snapshots => {
                console.log('Setting runtime snapshots:', snapshots);
              },
            }),
          },
        },
      ],
    },
  },
};

export const EmptySnapshots: Story = {
  args: {
    disabled: false,
    connection: mockConnection,
    multiServiceManager: mockMultiServiceManager,
    children: 'No Snapshots',
  },
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../api',
          default: {
            createRuntimeSnapshot: async () => ({}),
            getRuntimeSnapshots: async () => [],
            loadBrowserRuntimeSnapshot: async () => {},
            loadRuntimeSnapshot: async () => {},
          },
        },
        {
          path: '../../state',
          default: {
            useRuntimesStore: () => ({
              addRuntimeSnapshot: () => {},
              runtimesRunUrl: 'https://example.com',
              runtimeSnapshots: [],
              setRuntimeSnapshots: () => {},
            }),
          },
        },
      ],
    },
  },
};
