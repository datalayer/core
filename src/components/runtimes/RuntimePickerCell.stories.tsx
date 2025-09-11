/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RuntimePickerCell } from './RuntimePickerCell';
import type { IMultiServiceManager } from '../../api';

const meta = {
  title: 'Datalayer/Runtimes/RuntimePickerCell',
  component: RuntimePickerCell,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
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
          },
        },
        {
          path: '@datalayer/icons-react',
          default: {
            CloudUploadIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 0a5.53 5.53 0 00-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 4.095 0 5.555 0 7.318 0 9.366 1.708 11 3.781 11H7.5V5.5a.5.5 0 011 0V11h4.188C14.502 11 16 9.57 16 7.773c0-1.636-1.242-2.969-2.834-3.194C12.923 1.999 10.69 0 8 0z" />
              </svg>
            ),
          },
        },
        {
          path: '../../components/iam',
          default: {
            ExternalTokenSilentLogin: ({ children }) => <div>{children}</div>,
          },
        },
        {
          path: '../../state',
          default: {
            useIAMStore: () => ({
              token: 'mock-token',
            }),
            useCoreStore: () => ({
              configuration: {},
            }),
          },
        },
        {
          path: './RuntimeLauncherDialog',
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
          path: './RuntimePickerBase',
          default: {
            RuntimePickerBase: ({
              display,
              variant,
              preActions,
              postActions,
              disabled,
              multiServiceManager,
              setRuntimeDesc,
              runtimeDesc,
            }) => (
              <div
                style={{
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '12px',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {preActions}
                <div style={{ marginBottom: '8px' }}>
                  <strong>
                    Runtime Picker ({display} mode, {variant} variant)
                  </strong>
                </div>
                <div>
                  Current: {runtimeDesc?.display_name || 'None selected'}
                </div>
                <button
                  onClick={() =>
                    setRuntimeDesc?.({
                      id: 'python-3.11',
                      name: 'python3',
                      display_name: 'Python 3.11',
                      language: 'python',
                      location: 'local',
                      spec: {},
                    })
                  }
                  style={{ marginTop: '8px', padding: '4px 8px' }}
                >
                  Select Python
                </button>
                {postActions}
              </div>
            ),
          },
        },
        {
          path: './RuntimeCellVariablesDialog',
          default: {
            RuntimeCellVariablesDialog: ({ model, onClose }) => (
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
                  <h3>Mock Variables Dialog</h3>
                  <p>Cell ID: {model?.id || 'unknown'}</p>
                  <button onClick={onClose}>Close</button>
                </div>
              </div>
            ),
          },
        },
        {
          path: './../snippets/SnippetDialog',
          default: {
            SnippetDialog: ({
              snippets,
              onClose,
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
                  <h3>Mock Snippet Dialog</h3>
                  <p>Snippets: {snippets?.length || 0}</p>
                  <button onClick={onClose}>Close</button>
                </div>
              </div>
            ),
          },
        },
        {
          path: '@jupyterlab/translation',
          default: {
            nullTranslator: {
              load: () => ({
                __: key => key,
              }),
            },
          },
        },
      ],
    },
  },
  argTypes: {},
} satisfies Meta<typeof RuntimePickerCell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock CodeCellModel
const createMockModel = (hasCellKernel = false, isForeign = false) => ({
  id: 'cell-123',
  getMetadata: (key: string) => {
    if (key === 'datalayer') {
      return isForeign
        ? {
            kernel: {
              id: 'python-3.11',
              name: 'python3',
              display_name: 'Python 3.11',
              language: 'python',
              params: { notebook: !hasCellKernel },
            },
          }
        : {};
    }
    return {};
  },
  metadataChanged: {
    connect: () => {},
    disconnect: () => {},
  },
  setMetadata: () => {},
});

// Mock multi service manager
const mockMultiServiceManager: IMultiServiceManager = {
  local: {
    kernelspecs: {
      specs: {
        python3: {
          id: 'python3-local',
          name: 'python3',
          display_name: 'Python 3.11',
          language: 'python',
          location: 'local',
          spec: {},
        },
      },
    },
  },
  remote: {
    environments: {
      get: () => [
        {
          name: 'python3',
          language: 'python',
          title: 'Python 3.11',
          snippets: [
            { id: '1', title: 'Hello World', content: 'print("Hello")' },
            {
              id: '2',
              title: 'Import Libraries',
              content: 'import numpy as np',
            },
          ],
        },
        {
          name: 'ir',
          language: 'r',
          title: 'R 4.3',
          snippets: [{ id: '3', title: 'Basic Plot', content: 'plot(1:10)' }],
        },
      ],
    },
  },
} as any;

export const Default: Story = {
  args: {
    model: createMockModel(),
    multiServiceManager: mockMultiServiceManager,
    logIn: () => console.log('Login requested'),
  },
};

export const WithCellKernel: Story = {
  args: {
    model: createMockModel(true, true),
    multiServiceManager: mockMultiServiceManager,
    logIn: () => console.log('Login requested'),
  },
};

export const ForeignKernel: Story = {
  args: {
    model: createMockModel(false, true),
    multiServiceManager: mockMultiServiceManager,
    logIn: () => console.log('Login requested'),
  },
};

export const WithSessionContext: Story = {
  args: {
    model: createMockModel(),
    multiServiceManager: mockMultiServiceManager,
    sessionContext: {
      session: {
        kernel: {
          name: 'python3',
        },
      },
    } as any,
    logIn: () => console.log('Login requested'),
  },
};
