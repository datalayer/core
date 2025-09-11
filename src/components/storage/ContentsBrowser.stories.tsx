/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

const ContentsBrowser = ({
  path = '/',
  onNavigate,
  onSelect,
  selectedItems = [],
}) => (
  <div
    style={{
      border: '1px solid #d1d9e0',
      borderRadius: '8px',
      backgroundColor: 'white',
      width: '600px',
      height: '400px',
      overflow: 'hidden',
    }}
  >
    {/* Header */}
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #d1d9e0',
        backgroundColor: '#f6f8fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onNavigate?.('..')}
          disabled={path === '/'}
          style={{
            padding: '4px 8px',
            border: '1px solid #d1d9e0',
            borderRadius: '4px',
            cursor: path === '/' ? 'not-allowed' : 'pointer',
            opacity: path === '/' ? 0.5 : 1,
          }}
        >
          ← Back
        </button>
        <span style={{ fontWeight: 'bold', color: '#0366d6' }}>{path}</span>
      </div>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #d1d9e0',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        New Folder
      </button>
    </div>

    {/* File List */}
    <div style={{ padding: '8px' }}>
      {mockFiles.map((file, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: selectedItems.includes(file.name)
              ? '#f1f8ff'
              : 'transparent',
          }}
          onClick={() => onSelect?.(file)}
          onDoubleClick={() =>
            file.type === 'directory' && onNavigate?.(file.name)
          }
        >
          <span style={{ fontSize: '16px' }}>
            {file.type === 'directory' ? '📁' : getFileIcon(file.name)}
          </span>
          <span style={{ flex: 1 }}>{file.name}</span>
          <span style={{ fontSize: '12px', color: '#656d76' }}>
            {file.type === 'directory' ? '--' : formatFileSize(file.size)}
          </span>
          <span style={{ fontSize: '12px', color: '#656d76' }}>
            {file.modified}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const mockFiles = [
  { name: 'notebooks', type: 'directory', modified: '2024-01-15', size: 0 },
  { name: 'data', type: 'directory', modified: '2024-01-14', size: 0 },
  { name: 'analysis.ipynb', type: 'file', modified: '2024-01-15', size: 15420 },
  { name: 'dataset.csv', type: 'file', modified: '2024-01-13', size: 2048576 },
  { name: 'model.pkl', type: 'file', modified: '2024-01-12', size: 524288 },
  { name: 'README.md', type: 'file', modified: '2024-01-10', size: 1024 },
];

const getFileIcon = filename => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ipynb':
      return '📓';
    case 'py':
      return '🐍';
    case 'csv':
      return '📊';
    case 'json':
      return '📋';
    case 'pkl':
      return '🎯';
    case 'md':
      return '📄';
    default:
      return '📄';
  }
};

const formatFileSize = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const meta = {
  title: 'Datalayer/Storage/ContentsBrowser',
  component: ContentsBrowser,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    path: {
      control: 'text',
      description: 'Current directory path',
    },
    onNavigate: {
      action: 'navigate',
      description: 'Callback when navigating to a directory',
    },
    onSelect: {
      action: 'select',
      description: 'Callback when selecting a file',
    },
    selectedItems: {
      control: 'object',
      description: 'Array of selected item names',
    },
  },
} satisfies Meta<typeof ContentsBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    path: '/',
    onNavigate: path => console.log('Navigate to:', path),
    onSelect: file => console.log('Selected file:', file),
    selectedItems: [],
  },
};

export const WithSelection: Story = {
  args: {
    path: '/',
    onNavigate: path => console.log('Navigate to:', path),
    onSelect: file => console.log('Selected file:', file),
    selectedItems: ['analysis.ipynb', 'dataset.csv'],
  },
};

export const NestedPath: Story = {
  args: {
    path: '/notebooks/experiments',
    onNavigate: path => console.log('Navigate to:', path),
    onSelect: file => console.log('Selected file:', file),
    selectedItems: [],
  },
};
