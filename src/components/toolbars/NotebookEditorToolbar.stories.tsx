/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { NotebookEditorToolbar } from './NotebookEditorToolbar';

const meta = {
  title: 'Datalayer/Toolbars/NotebookEditorToolbar',
  component: NotebookEditorToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/jupyter-react',
          default: {
            NotebookCommandIds: {
              save: 'notebook:save',
              runAll: 'notebook:run-all',
              interrupt: 'notebook:interrupt',
            },
          },
        },
        {
          path: '@lumino/commands',
          default: {
            CommandRegistry: class {
              execute(id: string) {
                console.log('Executing command:', id);
                return Promise.resolve();
              }
              isEnabled(id: string) {
                return true;
              }
            },
          },
        },
        {
          path: '@primer/react',
          default: {
            Button: ({
              children,
              onClick,
              disabled,
              size,
              variant,
              ...props
            }) => (
              <button
                {...props}
                onClick={onClick}
                disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: size === 'small' ? '6px 12px' : '8px 16px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  backgroundColor:
                    variant === 'primary' ? '#0366d6' : '#f6f8fa',
                  color: variant === 'primary' ? 'white' : '#24292f',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  fontSize: '14px',
                }}
              >
                {children}
              </button>
            ),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            PlayIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
              </svg>
            ),
            StopIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4.47 4.47a.75.75 0 011.06 0L8 6.94l2.47-2.47a.75.75 0 111.06 1.06L9.06 8l2.47 2.47a.75.75 0 11-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 01-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 010-1.06z" />
              </svg>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    save: {
      action: 'saved',
      description: 'Callback to save the notebook',
    },
  },
} satisfies Meta<typeof NotebookEditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockCommandRegistry = {
  execute: (id: string) => {
    console.log('Executing command:', id);
    return Promise.resolve();
  },
  isEnabled: (id: string) => true,
};

const mockSessionConnection = {
  kernel: {
    status: 'idle',
    statusChanged: {
      connect: (callback: Function) => {
        console.log('Connected to status changed');
      },
      disconnect: (callback: Function) => {
        console.log('Disconnected from status changed');
      },
    },
  },
};

export const Default: Story = {
  args: {
    commandRegistry: mockCommandRegistry,
    runtimeDesc: {
      name: 'python3',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
    save: () => console.log('Notebook saved'),
    sessionConnection: mockSessionConnection,
  },
};

export const BusyKernel: Story = {
  args: {
    commandRegistry: mockCommandRegistry,
    runtimeDesc: {
      name: 'python3',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
    save: () => console.log('Notebook saved'),
    sessionConnection: {
      kernel: {
        status: 'busy',
        statusChanged: {
          connect: (callback: Function) => {},
          disconnect: (callback: Function) => {},
        },
      },
    },
  },
};

export const NoSession: Story = {
  args: {
    commandRegistry: mockCommandRegistry,
    runtimeDesc: {
      name: 'python3',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
    save: () => console.log('Notebook saved'),
    sessionConnection: undefined,
  },
};

export const NoCommandRegistry: Story = {
  args: {
    runtimeDesc: {
      name: 'python3',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
    save: () => console.log('Notebook saved'),
    sessionConnection: mockSessionConnection,
  },
};
