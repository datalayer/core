/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RuntimePickerBase } from './RuntimePickerBase';
import type { IRuntimeDesc, IMultiServiceManager } from '../../api';

const meta = {
  title: 'Datalayer/Runtimes/RuntimePickerBase',
  component: RuntimePickerBase,
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
              LinkItem: ({ children, href, ...props }) => (
                <a
                  {...props}
                  href={href}
                  style={{
                    padding: '8px 12px',
                    display: 'block',
                    textDecoration: 'none',
                    color: '#24292f',
                    borderBottom: '1px solid #d1d9e0',
                  }}
                >
                  {children}
                </a>
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
            Text: ({
              children,
              size = 'normal',
              color = 'default',
              ...props
            }) => (
              <span
                {...props}
                style={{
                  fontSize: size === 'small' ? '12px' : '14px',
                  color: color === 'muted' ? '#656d76' : '#24292f',
                }}
              >
                {children}
              </span>
            ),
            RadioGroup: ({ children, name, onChange, ...props }) => (
              <div
                {...props}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {children}
              </div>
            ),
            Radio: ({ checked, onChange, value, children, ...props }) => (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  backgroundColor: checked ? '#f1f8ff' : 'transparent',
                }}
              >
                <input
                  {...props}
                  type="radio"
                  checked={checked}
                  onChange={onChange}
                  value={value}
                  style={{ marginRight: '8px' }}
                />
                {children}
              </label>
            ),
            FormControl: ({ children, ...props }) => (
              <div {...props} style={{ marginBottom: '16px' }}>
                {children}
              </div>
            ),
            LabelGroup: ({ children, ...props }) => (
              <div
                {...props}
                style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
              >
                {children}
              </div>
            ),
            Label: ({ children, variant = 'default', ...props }) => (
              <span
                {...props}
                style={{
                  padding: '2px 6px',
                  fontSize: '12px',
                  borderRadius: '12px',
                  backgroundColor:
                    variant === 'secondary' ? '#f6f8fa' : '#0969da',
                  color: variant === 'secondary' ? '#24292f' : 'white',
                  border:
                    variant === 'secondary' ? '1px solid #d1d9e0' : 'none',
                }}
              >
                {children}
              </span>
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
            CpuIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M6.5 1A1.5 1.5 0 008 2.5V4h4a2 2 0 012 2v4a2 2 0 01-2 2H8v1.5a1.5 1.5 0 01-3 0V12H1a2 2 0 01-2-2V6a2 2 0 012-2h4V2.5A1.5 1.5 0 016.5 1zM5 4V2.5a.5.5 0 011 0V4h2V2.5a.5.5 0 011 0V4h3a1 1 0 011 1v4a1 1 0 01-1 1H9v1.5a.5.5 0 01-1 0V10H6v1.5a.5.5 0 01-1 0V10H2a1 1 0 01-1-1V5a1 1 0 011-1h3z" />
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
            LaptopSimpleIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M1 4.5A1.5 1.5 0 012.5 3h11A1.5 1.5 0 0115 4.5v6a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 10.5v-6z" />
              </svg>
            ),
          },
        },
        {
          path: '@datalayer/icons-react/data1/CloudUploadIcon',
          default: () => (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a5.53 5.53 0 00-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 4.095 0 5.555 0 7.318 0 9.366 1.708 11 3.781 11H7.5V5.5a.5.5 0 011 0V11h4.188C14.502 11 16 9.57 16 7.773c0-1.636-1.242-2.969-2.834-3.194C12.923 1.999 10.69 0 8 0z" />
            </svg>
          ),
        },
        {
          path: '../../components/progress',
          default: {
            CreditsIndicator: ({ credits }) => (
              <div style={{ fontSize: '12px', color: '#656d76' }}>
                Credits: {credits}
              </div>
            ),
          },
        },
        {
          path: './RuntimeUtils',
          default: {
            getGroupedRuntimeDescs: descs => ({
              remote: descs.filter(d => d.location === 'remote'),
              local: descs.filter(d => d.location === 'local'),
            }),
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
  argTypes: {
    display: {
      control: { type: 'radio' },
      options: ['menu', 'radio'],
      description: 'Display mode for the picker',
    },
    variant: {
      control: { type: 'radio' },
      options: ['document', 'cell'],
      description: 'Visual variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the picker is disabled',
    },
  },
} satisfies Meta<typeof RuntimePickerBase>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock runtime descriptions
const mockRuntimeDescs: IRuntimeDesc[] = [
  {
    id: 'python-3.11-local',
    name: 'python3',
    display_name: 'Python 3.11',
    language: 'python',
    location: 'local',
    spec: {},
  },
  {
    id: 'python-3.11-remote',
    name: 'python3-remote',
    display_name: 'Python 3.11 (Remote)',
    language: 'python',
    location: 'remote',
    spec: {},
  },
  {
    id: 'r-4.3-remote',
    name: 'ir-remote',
    display_name: 'R 4.3 (Remote)',
    language: 'r',
    location: 'remote',
    spec: {},
  },
  {
    id: 'julia-1.9-remote',
    name: 'julia-remote',
    display_name: 'Julia 1.9 (Remote)',
    language: 'julia',
    location: 'remote',
    spec: {},
  },
];

// Mock multi service manager
const mockMultiServiceManager: IMultiServiceManager = {
  local: {
    kernelspecs: {
      specs: {
        python3: mockRuntimeDescs[0],
      },
    },
  },
  remote: {
    kernelspecs: {
      specs: {
        'python3-remote': mockRuntimeDescs[1],
        'ir-remote': mockRuntimeDescs[2],
        'julia-remote': mockRuntimeDescs[3],
      },
    },
  },
} as any;

const InteractiveTemplate = args => {
  const [runtimeDesc, setRuntimeDesc] = useState<IRuntimeDesc | undefined>(
    args.runtimeDesc,
  );

  return (
    <div style={{ width: '300px' }}>
      <RuntimePickerBase
        {...args}
        runtimeDesc={runtimeDesc}
        setRuntimeDesc={setRuntimeDesc}
        multiServiceManager={mockMultiServiceManager}
      />
    </div>
  );
};

export const MenuMode: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'menu',
    variant: 'document',
    disabled: false,
  },
};

export const RadioMode: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'radio',
    variant: 'document',
    disabled: false,
  },
};

export const CellVariant: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'menu',
    variant: 'cell',
    disabled: false,
  },
};

export const Disabled: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'menu',
    variant: 'document',
    disabled: true,
  },
};

export const WithPreselection: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'menu',
    variant: 'document',
    disabled: false,
    runtimeDesc: mockRuntimeDescs[1],
  },
};

export const WithPreActions: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'menu',
    variant: 'document',
    disabled: false,
    preActions: (
      <div style={{ padding: '8px', fontWeight: 'bold' }}>
        Custom Pre Actions
      </div>
    ),
  },
};

export const WithPostActions: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'menu',
    variant: 'document',
    disabled: false,
    postActions: (
      <div style={{ padding: '8px', fontStyle: 'italic' }}>
        Custom Post Actions
      </div>
    ),
  },
};

export const FilteredRuntimes: Story = {
  render: InteractiveTemplate,
  args: {
    display: 'radio',
    variant: 'document',
    disabled: false,
    filterKernel: (desc: IRuntimeDesc) => desc.language === 'python',
  },
};
