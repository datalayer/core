/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RuntimeLauncherDialog } from './RuntimeLauncherDialog';
import type { IRemoteServicesManager } from '../../api';
import type { IRuntimeDesc } from '../../models';

const meta = {
  title: 'Datalayer/Runtimes/RuntimeLauncherDialog',
  component: RuntimeLauncherDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Button: ({ children, onClick, variant = 'primary', ...props }) => (
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
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                {children}
              </button>
            ),
            FormControl: {
              Label: ({ children, ...props }) => (
                <label
                  {...props}
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontWeight: 600,
                  }}
                >
                  {children}
                </label>
              ),
            },
            Select: ({ children, value, onChange, ...props }) => (
              <select
                {...props}
                value={value}
                onChange={onChange}
                style={{
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '8px',
                  width: '100%',
                }}
              >
                {children}
              </select>
            ),
            TextInput: ({ value, onChange, placeholder, ...props }) => (
              <input
                {...props}
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '8px',
                  width: '100%',
                }}
              />
            ),
            ToggleSwitch: ({ checked, onClick, disabled, ...props }) => (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={onClick}
                  disabled={disabled}
                  style={{ marginRight: '8px' }}
                  {...props}
                />
                <span>Toggle</span>
              </label>
            ),
            Spinner: ({ size = 'medium' }) => (
              <div
                style={{
                  width: size === 'small' ? '16px' : '24px',
                  height: size === 'small' ? '16px' : '24px',
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid #0969da',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ),
            Text: ({ children, ...props }) => (
              <span {...props}>{children}</span>
            ),
            Tooltip: ({ children }) => <div>{children}</div>,
            IconButton: ({ icon: Icon, onClick, ...props }) => (
              <button
                {...props}
                onClick={onClick}
                style={{
                  background: 'none',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} />
              </button>
            ),
          },
        },
        {
          path: '@primer/react/experimental',
          default: {
            Dialog: ({ children, isOpen = true, title, ...props }) => (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: isOpen ? 'flex' : 'none',
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
                    minWidth: '400px',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                  }}
                >
                  {title && (
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
                      {title}
                    </h2>
                  )}
                  {children}
                </div>
              </div>
            ),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            AlertIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"
                />
              </svg>
            ),
          },
        },
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, as = 'div', sx, ...props }) => {
              const Component = as;
              return (
                <Component
                  {...props}
                  style={{
                    ...sx,
                    padding: sx?.p ? `${sx.p * 8}px` : undefined,
                    paddingTop: sx?.paddingTop,
                  }}
                >
                  {children}
                </Component>
              );
            },
          },
        },
        {
          path: '../../state',
          default: {
            iamStore: {
              getState: () => ({
                user: { name: 'Test User', email: 'test@example.com' },
              }),
            },
            useCoreStore: () => ({
              configuration: { some: 'config' },
            }),
            useIAMStore: () => ({
              credits: { available: 100, used: 20 },
              refreshCredits: () => {},
            }),
            useRuntimesStore: () => ({
              jupyterLabAdapter: {},
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useNavigate: () => url => console.log('Navigate to:', url),
          },
        },
        {
          path: '../../utils',
          default: {
            createNotebook: () => Promise.resolve({ content: 'notebook' }),
            sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
          },
        },
        {
          path: '../display',
          default: {
            Markdown: ({ children }) => <div>{children}</div>,
          },
        },
        {
          path: '../progress',
          default: {
            Timer: ({ duration, onComplete }) => (
              <div>Timer: {duration}min</div>
            ),
          },
        },
        {
          path: '../flashes',
          default: {
            FlashClosable: ({ children, variant = 'default', actions }) => (
              <div
                style={{
                  padding: '12px',
                  backgroundColor:
                    variant === 'warning' ? '#fff3cd' : '#d1ecf1',
                  border: `1px solid ${
                    variant === 'warning' ? '#ffeaa7' : '#bee5eb'
                  }`,
                  borderRadius: '6px',
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {children}
                {actions}
              </div>
            ),
          },
        },
        {
          path: './RuntimeReservationControl',
          default: {
            RuntimeReservationControl: ({ timeLimit, setTimeLimit }) => (
              <div>
                <label>Time Limit: {timeLimit} minutes</label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={timeLimit}
                  onChange={e => setTimeLimit(Number(e.target.value))}
                />
              </div>
            ),
            MAXIMAL_RUNTIME_TIME_RESERVATION_MINUTES: 60,
          },
        },
        {
          path: 'usehooks-ts',
          default: {
            useIsMounted: () => () => true,
          },
        },
      ],
    },
  },
  argTypes: {
    dialogTitle: {
      control: 'text',
      description: 'Dialog title',
    },
    startKernel: {
      control: { type: 'select' },
      options: [true, false, 'with-example', 'defer'],
      description: 'Whether to start the kernel',
    },
  },
} satisfies Meta<typeof RuntimeLauncherDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock manager for stories
const createMockManager = (): IRemoteServicesManager =>
  ({
    environments: {
      get: () => [
        {
          name: 'python-3.11',
          title: 'Python 3.11',
          kernel: {
            givenNameTemplate: 'Python Environment',
          },
          example: {
            content: 'print("Hello World")',
          },
        },
        {
          name: 'r-4.3',
          title: 'R 4.3',
          kernel: {
            givenNameTemplate: 'R Environment',
          },
        },
        {
          name: 'julia-1.9',
          title: 'Julia 1.9',
          kernel: {
            givenNameTemplate: 'Julia Environment',
          },
          example: {
            content: 'println("Hello Julia")',
          },
        },
      ],
    },
    runtimes: {
      create: async () => ({
        id: 'runtime-123',
        name: 'Test Runtime',
        status: 'running',
      }),
    },
  }) as any;

export const Default: Story = {
  args: {
    dialogTitle: 'Start New Runtime',
    manager: createMockManager(),
    onSubmit: (spec?: IRuntimeDesc) => {
      console.log('Runtime submitted:', spec);
    },
    startKernel: true,
  },
};

export const WithExample: Story = {
  args: {
    dialogTitle: 'Start Runtime with Example',
    manager: createMockManager(),
    onSubmit: (spec?: IRuntimeDesc) => {
      console.log('Runtime with example submitted:', spec);
    },
    startKernel: 'with-example',
  },
};

export const DeferredStart: Story = {
  args: {
    dialogTitle: 'Configure Runtime (Deferred Start)',
    manager: createMockManager(),
    onSubmit: (spec?: IRuntimeDesc) => {
      console.log('Deferred runtime submitted:', spec);
    },
    startKernel: 'defer',
  },
};

export const WithSnapshot: Story = {
  args: {
    dialogTitle: 'Restore from Snapshot',
    manager: createMockManager(),
    onSubmit: (spec?: IRuntimeDesc) => {
      console.log('Snapshot runtime submitted:', spec);
    },
    startKernel: true,
    kernelSnapshot: {
      id: 'snapshot-123',
      name: 'My Snapshot',
      environment: 'python-3.11',
      created_at: '2023-01-01T00:00:00Z',
    } as any,
  },
};

export const WithUpgradeOption: Story = {
  args: {
    dialogTitle: 'Runtime Launcher',
    manager: createMockManager(),
    onSubmit: (spec?: IRuntimeDesc) => {
      console.log('Runtime submitted:', spec);
    },
    startKernel: true,
    upgradeSubscription: '/upgrade',
  },
};
