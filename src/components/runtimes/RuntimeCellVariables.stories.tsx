/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RuntimeCellVariables } from './RuntimeCellVariables';

const meta = {
  title: 'Datalayer/Runtimes/RuntimeCellVariables',
  component: RuntimeCellVariables,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Autocomplete: {
              Input: ({ tokens, onTokenRemove, onChange, value, ...props }) => (
                <div
                  style={{
                    border: '1px solid #d1d9e0',
                    borderRadius: '6px',
                    padding: '8px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}
                >
                  {tokens &&
                    tokens.map(token => (
                      <span
                        key={token.id}
                        style={{
                          backgroundColor: '#f6f8fa',
                          border: '1px solid #d1d9e0',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {token.text}
                        <button
                          onClick={() => onTokenRemove?.(token.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  <input
                    {...props}
                    value={value || ''}
                    onChange={onChange}
                    style={{
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: '100px',
                    }}
                    placeholder={!tokens?.length ? 'Select variables...' : ''}
                  />
                </div>
              ),
              Overlay: ({ children }) => (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: 'white',
                    border: '1px solid #d1d9e0',
                    borderRadius: '6px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {children}
                </div>
              ),
              Menu: ({
                items = [],
                selectedItemIds = [],
                onSelectedChange,
                loading,
                emptyStateText,
                selectionVariant,
                addNewItem,
              }) => (
                <div>
                  {loading && <div style={{ padding: '8px' }}>Loading...</div>}
                  {!loading && items.length === 0 && (
                    <div style={{ padding: '8px', color: '#656d76' }}>
                      {emptyStateText}
                    </div>
                  )}
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (selectionVariant === 'multiple') {
                          const isSelected = selectedItemIds.includes(item.id);
                          const newSelection = isSelected
                            ? selectedItemIds.filter(id => id !== item.id)
                            : [...selectedItemIds, item.id];
                          onSelectedChange?.(
                            items.filter(i => newSelection.includes(i.id)),
                          );
                        } else {
                          onSelectedChange?.(item);
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: selectedItemIds.includes(item.id)
                          ? '#f1f8ff'
                          : 'transparent',
                        ':hover': {
                          backgroundColor: '#f6f8fa',
                        },
                      }}
                    >
                      {selectionVariant === 'multiple' && (
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          readOnly
                          style={{ marginRight: '8px' }}
                        />
                      )}
                      {item.text}
                    </div>
                  ))}
                  {addNewItem && (
                    <div
                      onClick={() => addNewItem.handleAddItem(addNewItem)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderTop: '1px solid #d1d9e0',
                        color: '#0969da',
                      }}
                    >
                      {addNewItem.text}
                    </div>
                  )}
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
            TextInputWithTokens: ({ tokens, onTokenRemove, ...props }) => (
              <div>Mock TextInputWithTokens</div>
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
          path: '@jupyterlab/translation',
          default: {
            nullTranslator: {
              load: () => ({
                __: (key, ...args) => {
                  if (args.length > 0) {
                    return key.replace('%1', args[0]);
                  }
                  return key;
                },
              }),
            },
          },
        },
      ],
    },
  },
  argTypes: {
    inputs: {
      control: 'object',
      description: 'Variable names to be imported',
    },
    output: {
      control: 'text',
      description: 'Variable name to be exported',
    },
  },
} satisfies Meta<typeof RuntimeCellVariables>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveTemplate = args => {
  const [inputs, setInputs] = useState(args.inputs || []);
  const [output, setOutput] = useState(args.output || '');

  const mockGetInputOptions = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return ['df', 'x', 'y', 'model', 'data', 'results', 'config'];
  };

  const mockGetOutputOptions = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return ['processed_data', 'analysis_results', 'final_model', 'predictions'];
  };

  return (
    <div style={{ width: '400px' }}>
      <RuntimeCellVariables
        {...args}
        inputs={inputs}
        setInputs={setInputs}
        output={output}
        setOutput={setOutput}
        getInputOptions={mockGetInputOptions}
        getOutputOptions={mockGetOutputOptions}
      />
    </div>
  );
};

export const Default: Story = {
  render: InteractiveTemplate,
  args: {
    inputs: ['df', 'x'],
    output: 'results',
  },
};

export const Empty: Story = {
  render: InteractiveTemplate,
  args: {
    inputs: [],
    output: '',
  },
};

export const WithManyInputs: Story = {
  render: InteractiveTemplate,
  args: {
    inputs: ['df_train', 'df_test', 'model', 'scaler', 'predictions'],
    output: 'final_results',
  },
};

export const NoOptionsProvided: Story = {
  render: args => {
    const [inputs, setInputs] = useState(args.inputs || []);
    const [output, setOutput] = useState(args.output || '');

    return (
      <div style={{ width: '400px' }}>
        <RuntimeCellVariables
          {...args}
          inputs={inputs}
          setInputs={setInputs}
          output={output}
          setOutput={setOutput}
        />
      </div>
    );
  },
  args: {
    inputs: ['manual_var'],
    output: 'manual_output',
  },
};
