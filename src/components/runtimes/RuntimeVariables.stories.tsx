/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RuntimeVariables } from './RuntimeVariables';

const meta = {
  title: 'Datalayer/Runtimes/RuntimeVariables',
  component: RuntimeVariables,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            IconButton: ({
              icon: Icon,
              onClick,
              'aria-label': ariaLabel,
              ...props
            }) => (
              <button
                {...props}
                onClick={onClick}
                aria-label={ariaLabel}
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
            ToggleSwitch: ({ checked, onChange, ...props }) => (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => onChange(e.target.checked)}
                  style={{ marginRight: '8px' }}
                  {...props}
                />
                <span>Transfer Variables</span>
              </label>
            ),
            FormControl: ({ children }) => (
              <div style={{ marginBottom: '16px' }}>{children}</div>
            ),
          },
        },
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, ...props }) => <div {...props}>{children}</div>,
          },
        },
        {
          path: '@primer/react/experimental',
          default: {
            Blankslate: ({ children }) => (
              <div
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#656d76',
                  border: '1px solid #d1d9e0',
                  borderRadius: '8px',
                  backgroundColor: '#f6f8fa',
                }}
              >
                {children}
              </div>
            ),
            DataTable: ({ children, ...props }) => (
              <div
                style={{ border: '1px solid #d1d9e0', borderRadius: '8px' }}
                {...props}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  {children}
                </table>
              </div>
            ),
            Table: {
              Head: ({ children }) => <thead>{children}</thead>,
              Body: ({ children }) => <tbody>{children}</tbody>,
              Row: ({ children, selected, onClick, ...props }) => (
                <tr
                  {...props}
                  onClick={onClick}
                  style={{
                    backgroundColor: selected ? '#f1f8ff' : 'transparent',
                    borderBottom: '1px solid #d1d9e0',
                    cursor: onClick ? 'pointer' : 'default',
                  }}
                >
                  {children}
                </tr>
              ),
              Cell: ({ children }) => (
                <td style={{ padding: '12px', textAlign: 'left' }}>
                  {children}
                </td>
              ),
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
        {
          path: '@jupyterlab/ui-components',
          default: {
            checkIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
                />
              </svg>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    kernelVariables: {
      control: 'object',
      description: 'Available kernel variables mapping (name -> type)',
    },
    transferVariables: {
      control: 'boolean',
      description: 'Whether to enable variable transfer',
    },
  },
} satisfies Meta<typeof RuntimeVariables>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveTemplate = args => {
  const [selectedVariables, setSelectedVariables] = useState(
    args.selectedVariables || [],
  );
  const [transferVariables, setTransferVariables] = useState(
    args.transferVariables ?? true,
  );

  return (
    <RuntimeVariables
      {...args}
      selectedVariables={selectedVariables}
      setSelectVariable={setSelectedVariables}
      transferVariables={transferVariables}
      setTransferVariable={setTransferVariables}
    />
  );
};

export const Default: Story = {
  render: InteractiveTemplate,
  args: {
    kernelVariables: {
      df: 'DataFrame',
      x: 'int',
      y: 'float',
      name: 'str',
      data: 'list',
      model: 'sklearn.LinearRegression',
    },
    selectedVariables: ['df', 'x'],
    transferVariables: true,
  },
};

export const EmptyVariables: Story = {
  render: InteractiveTemplate,
  args: {
    kernelVariables: {},
    selectedVariables: [],
    transferVariables: true,
  },
};

export const ManyVariables: Story = {
  render: InteractiveTemplate,
  args: {
    kernelVariables: {
      df_train: 'DataFrame',
      df_test: 'DataFrame',
      X_train: 'numpy.ndarray',
      X_test: 'numpy.ndarray',
      y_train: 'numpy.ndarray',
      y_test: 'numpy.ndarray',
      model: 'sklearn.LinearRegression',
      scaler: 'sklearn.StandardScaler',
      pipeline: 'sklearn.Pipeline',
      accuracy: 'float',
      predictions: 'numpy.ndarray',
      feature_names: 'list',
      target_name: 'str',
      config: 'dict',
      results: 'dict',
    },
    selectedVariables: ['df_train', 'model', 'accuracy'],
    transferVariables: true,
  },
};

export const NoTransfer: Story = {
  render: InteractiveTemplate,
  args: {
    kernelVariables: {
      data: 'DataFrame',
      results: 'dict',
      plot: 'matplotlib.Figure',
    },
    selectedVariables: [],
    transferVariables: false,
  },
};

export const ComplexTypes: Story = {
  render: InteractiveTemplate,
  args: {
    kernelVariables: {
      numpy_array: 'numpy.ndarray',
      pandas_series: 'pandas.Series',
      matplotlib_fig: 'matplotlib.figure.Figure',
      sklearn_model: 'sklearn.ensemble.RandomForestClassifier',
      torch_tensor: 'torch.Tensor',
      custom_class: 'MyCustomClass',
      lambda_func: 'function',
      nested_dict: 'dict',
    },
    selectedVariables: ['numpy_array', 'sklearn_model'],
    transferVariables: true,
  },
};
