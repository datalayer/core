/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

const SnippetDialog = ({ onClose, title = 'Code Snippet' }) => (
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
      minWidth: '500px',
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
    <div style={{ marginBottom: '16px' }}>
      <pre
        style={{
          background: '#f6f8fa',
          border: '1px solid #d1d9e0',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '14px',
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          overflow: 'auto',
          maxHeight: '300px',
        }}
      >
        {`import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('data.csv')
print(df.head())`}
      </pre>
    </div>
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button
        onClick={onClose}
        style={{
          padding: '8px 16px',
          border: '1px solid #d1d9e0',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: 'white',
        }}
      >
        Cancel
      </button>
      <button
        onClick={() => console.log('Insert snippet')}
        style={{
          padding: '8px 16px',
          border: '1px solid #d1d9e0',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: '#0366d6',
          color: 'white',
        }}
      >
        Insert
      </button>
    </div>
  </div>
);

const meta = {
  title: 'Datalayer/Snippets/SnippetDialog',
  component: SnippetDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onClose: {
      action: 'dialog closed',
      description: 'Callback when dialog is closed',
    },
    title: {
      control: 'text',
      description: 'Dialog title',
    },
  },
} satisfies Meta<typeof SnippetDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => console.log('Dialog closed'),
    title: 'Insert Code Snippet',
  },
};
