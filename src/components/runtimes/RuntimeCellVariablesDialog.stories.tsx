/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { RuntimeCellVariablesDialog } from './RuntimeCellVariablesDialog';

// Mock CodeCellModel
const createMockCellModel = (sourceCode: string) => ({
  id: 'mock-cell-id',
  type: 'code',
  source: sourceCode,
  metadata: {},
  outputs: [],
  executionCount: null,
  trusted: false,
  mimeType: 'text/x-python',
});

const meta = {
  title: 'Datalayer/Runtimes/RuntimeCellVariablesDialog',
  component: RuntimeCellVariablesDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react/experimental',
          default: {
            Dialog: ({ children, onClose, title, ...props }) => (
              <div
                {...props}
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
                  minWidth: '500px',
                  maxWidth: '700px',
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
                  <h2 style={{ margin: 0, fontSize: '18px' }}>
                    {title || 'Runtime Cell Variables'}
                  </h2>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div>{children}</div>
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
        {
          path: '@datalayer/jupyter-react',
          default: {
            KernelExecutor: ({ children }) => (
              <div
                style={{
                  padding: '16px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '8px',
                  backgroundColor: '#f6f8fa',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: '#656d76',
                    marginBottom: '8px',
                  }}
                >
                  Mock Kernel Executor
                </div>
                {children}
              </div>
            ),
          },
        },
        {
          path: '../../api',
          default: {
            RuntimeSnippetsFacade: class {
              static async getInputVariables() {
                return ['df', 'x', 'y', 'model'];
              }
              static async getOutputVariable() {
                return 'result';
              }
            },
          },
        },
        {
          path: './RuntimeCellVariables',
          default: {
            KernelCellVariables: ({
              inputs,
              output,
              onInputsChange,
              onOutputChange,
            }) => (
              <div style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                    }}
                  >
                    Input Variables
                  </h3>
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {inputs.map(input => (
                      <span
                        key={input}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#e1f5fe',
                          border: '1px solid #0366d6',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        {input}
                      </span>
                    ))}
                    {inputs.length === 0 && (
                      <span style={{ color: '#656d76', fontSize: '12px' }}>
                        No input variables detected
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                    }}
                  >
                    Output Variable
                  </h3>
                  {output ? (
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f1f8ff',
                        border: '1px solid #28a745',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {output}
                    </span>
                  ) : (
                    <span style={{ color: '#656d76', fontSize: '12px' }}>
                      No output variable detected
                    </span>
                  )}
                </div>
              </div>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    model: {
      description: 'Code cell model containing the source code',
    },
    onClose: {
      action: 'dialog closed',
      description: 'Callback when dialog is closed',
    },
    preference: {
      control: 'object',
      description: 'Session preference with kernel details',
    },
  },
} satisfies Meta<typeof RuntimeCellVariablesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PythonDataAnalysis: Story = {
  args: {
    model: createMockCellModel(`
import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('data.csv')
x = df['feature1']
y = df['target']

# Create model
from sklearn.linear_model import LinearRegression
model = LinearRegression()
model.fit(x.values.reshape(-1, 1), y)

# Make predictions
result = model.predict(x.values.reshape(-1, 1))
    `),
    onClose: () => console.log('Dialog closed'),
    preference: {
      id: 'python3-kernel',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
  },
};

export const SimpleCalculation: Story = {
  args: {
    model: createMockCellModel(`
a = 10
b = 20
result = a + b
print(f"Result: {result}")
    `),
    onClose: () => console.log('Dialog closed'),
    preference: {
      id: 'python3-kernel',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
  },
};

export const MachineLearning: Story = {
  args: {
    model: createMockCellModel(`
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load dataset
data = load_iris()
X, y = data.data, data.target

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Train model
classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train, y_train)

# Evaluate
accuracy = classifier.score(X_test, y_test)
predictions = classifier.predict(X_test)
    `),
    onClose: () => console.log('Dialog closed'),
    preference: {
      id: 'python3-kernel',
      kernelDisplayName: 'Python 3 (ML)',
      language: 'python',
    },
  },
};

export const EmptyCell: Story = {
  args: {
    model: createMockCellModel(''),
    onClose: () => console.log('Dialog closed'),
    preference: {
      id: 'python3-kernel',
      kernelDisplayName: 'Python 3',
      language: 'python',
    },
  },
};

export const NoPreference: Story = {
  args: {
    model: createMockCellModel(`
data = [1, 2, 3, 4, 5]
mean_value = sum(data) / len(data)
    `),
    onClose: () => console.log('Dialog closed'),
  },
};
