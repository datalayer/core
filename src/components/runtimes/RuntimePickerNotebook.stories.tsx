/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { RuntimePickerNotebook } from './RuntimePickerNotebook';
import type { IMultiServiceManager, IDatalayerSessionContext } from '../../api';
import type { CommandRegistry } from '@lumino/commands';

const meta = {
  title: 'Datalayer/Runtimes/RuntimePickerNotebook',
  component: RuntimePickerNotebook,
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} />
              </button>
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
                  }}
                >
                  {children}
                </Component>
              );
            },
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
          path: '@datalayer/jupyter-react',
          default: {
            KernelExecutor: ({ children }) => <div>{children}</div>,
          },
        },
        {
          path: '../../theme',
          default: {
            DatalayerThemeProvider: ({ children }) => <div>{children}</div>,
          },
        },
        {
          path: '../../api',
          default: {
            RuntimeSnippetsFacade: class MockSnippetsFacade {
              static async getSnippets() {
                return [];
              }
            },
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
            useCoreStore: () => ({
              configuration: {},
            }),
            useIAMStore: () => ({
              credits: { available: 100, used: 20 },
              refreshCredits: () => {},
              token: 'mock-token',
            }),
          },
        },
        {
          path: './RuntimeReservationControl',
          default: {
            RuntimeReservationControl: ({ timeLimit, setTimeLimit }) => (
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}
                >
                  Time Limit: {timeLimit} minutes
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={timeLimit}
                  onChange={e => setTimeLimit(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            ),
            MAXIMAL_RUNTIME_TIME_RESERVATION_MINUTES: 60,
          },
        },
        {
          path: './RuntimeVariables',
          default: {
            RuntimeVariables: ({
              kernelVariables,
              selectedVariables,
              setSelectVariable,
              transferVariables,
              setTransferVariable,
            }) => (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                }}
              >
                <div style={{ marginBottom: '8px', fontWeight: 600 }}>
                  Runtime Variables
                </div>
                <div style={{ fontSize: '12px', color: '#656d76' }}>
                  Variables:{' '}
                  {Object.keys(kernelVariables || {}).join(', ') || 'None'}
                </div>
                <div style={{ fontSize: '12px', color: '#656d76' }}>
                  Selected: {selectedVariables?.join(', ') || 'None'}
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={transferVariables}
                    onChange={e => setTransferVariable?.(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Transfer Variables
                </label>
              </div>
            ),
          },
        },
        {
          path: './RuntimePickerBase',
          default: {
            RuntimePickerBase: ({
              display = 'menu',
              variant = 'document',
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
                  marginBottom: '16px',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {preActions}
                <div style={{ marginBottom: '8px' }}>
                  <strong>
                    Runtime Picker ({display} mode, {variant} variant)
                  </strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  Current: {runtimeDesc?.display_name || 'None selected'}
                </div>
                <select
                  onChange={e => {
                    const value = e.target.value;
                    if (value) {
                      setRuntimeDesc?.({
                        id: value,
                        name: value,
                        display_name:
                          value === 'python3'
                            ? 'Python 3.11'
                            : value === 'ir'
                              ? 'R 4.3'
                              : 'Julia 1.9',
                        language:
                          value === 'python3'
                            ? 'python'
                            : value === 'ir'
                              ? 'r'
                              : 'julia',
                        location: 'remote',
                        spec: {},
                      });
                    }
                  }}
                  style={{ width: '100%', padding: '4px 8px' }}
                >
                  <option value="">Select Runtime</option>
                  <option value="python3">Python 3.11</option>
                  <option value="ir">R 4.3</option>
                  <option value="julia">Julia 1.9</option>
                </select>
                {postActions}
              </div>
            ),
          },
        },
        {
          path: './RuntimeTransfer',
          default: {
            RuntimeTransfer: class MockRuntimeTransfer {
              constructor(
                public kernelId: string,
                public transferVariables: boolean,
                public variableNames: string[],
              ) {}
            },
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
} satisfies Meta<typeof RuntimePickerNotebook>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock session context
const createMockSessionContext = (
  hasKernel = false,
): IDatalayerSessionContext =>
  ({
    specsManager: {
      specs: {
        kernelspecs: {
          python3: {
            id: 'python3',
            name: 'python3',
            display_name: 'Python 3.11',
            language: 'python',
            spec: {},
          },
        },
      },
    },
    session: hasKernel
      ? {
          kernel: {
            name: 'python3',
            id: 'kernel-123',
          },
        }
      : null,
    sessionChanged: {
      connect: () => {},
      disconnect: () => {},
    },
  }) as any;

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
        },
        {
          name: 'ir',
          language: 'r',
          title: 'R 4.3',
        },
      ],
    },
  },
} as any;

// Mock command registry
const mockCommands: CommandRegistry = {
  execute: () => Promise.resolve(),
} as any;

export const Default: Story = {
  args: {
    sessionContext: createMockSessionContext(),
    multiServiceManager: mockMultiServiceManager,
    setValue: value => console.log('Value set:', value),
    close: () => console.log('Dialog closed'),
    commands: mockCommands,
    logIn: () => console.log('Login requested'),
  },
};

export const WithActiveKernel: Story = {
  args: {
    sessionContext: createMockSessionContext(true),
    multiServiceManager: mockMultiServiceManager,
    setValue: value => console.log('Value set:', value),
    close: () => console.log('Dialog closed'),
    commands: mockCommands,
    logIn: () => console.log('Login requested'),
  },
};

export const WithVariableTransfer: Story = {
  args: {
    sessionContext: createMockSessionContext(true),
    multiServiceManager: mockMultiServiceManager,
    setValue: value => console.log('Value set:', value),
    close: () => console.log('Dialog closed'),
    commands: mockCommands,
    logIn: () => console.log('Login requested'),
  },
};
