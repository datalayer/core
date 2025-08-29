/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DataTable } from './DataTable';

const meta = {
  title: 'Datalayer/Tables/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Box: ({ children, ...props }) => <div {...props}>{children}</div>,
            Button: ({ children, onClick, ...props }) => (
              <button
                {...props}
                onClick={onClick}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  backgroundColor: '#f6f8fa',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {children}
              </button>
            ),
            PageLayout: ({
              children,
              containerWidth,
              padding,
              sx,
              ...props
            }) => (
              <div
                {...props}
                style={{
                  width: containerWidth === 'full' ? '100%' : 'auto',
                  padding: padding === 'normal' ? '16px' : '8px',
                  ...sx,
                }}
              >
                {children}
              </div>
            ),
            'PageLayout.Content': ({ children }) => (
              <div
                style={{
                  padding: '16px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '8px',
                  backgroundColor: '#f6f8fa',
                  minHeight: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#656d76',
                }}
              >
                {children || 'Data table content would be rendered here'}
              </div>
            ),
          },
        },
        {
          path: '@primer/react/experimental',
          default: {
            Dialog: ({ children, sx, onClose }) => (
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
                  zIndex: 1000,
                  ...sx,
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
                    Data Table - Zoomed View
                  </h2>
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
                {children}
              </div>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    data: {
      control: 'object',
      description: 'Array of data to display in the table',
    },
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' },
    ],
  },
};

export const LargeDataset: Story = {
  args: {
    data: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ['Admin', 'User', 'Editor'][i % 3],
      department: ['Engineering', 'Marketing', 'Sales', 'Support'][i % 4],
      joinDate: new Date(2020 + (i % 4), i % 12, (i % 28) + 1)
        .toISOString()
        .split('T')[0],
    })),
  },
};

export const EmptyData: Story = {
  args: {
    data: [],
  },
};

export const ComplexData: Story = {
  args: {
    data: [
      {
        id: 1,
        project: 'Data Analysis Dashboard',
        status: 'Active',
        progress: 85,
        team: ['Alice', 'Bob', 'Charlie'],
        budget: 50000,
        deadline: '2024-03-15',
        metrics: { views: 1250, users: 89, conversion: 0.12 },
      },
      {
        id: 2,
        project: 'ML Model Training',
        status: 'In Progress',
        progress: 60,
        team: ['Dave', 'Eve'],
        budget: 75000,
        deadline: '2024-04-30',
        metrics: { accuracy: 0.94, precision: 0.87, recall: 0.91 },
      },
      {
        id: 3,
        project: 'API Integration',
        status: 'Planning',
        progress: 20,
        team: ['Frank', 'Grace', 'Henry', 'Ivy'],
        budget: 30000,
        deadline: '2024-06-01',
        metrics: { endpoints: 12, tests: 45, coverage: 0.78 },
      },
    ],
  },
};
