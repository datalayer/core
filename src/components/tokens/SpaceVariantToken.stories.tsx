/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { SpaceVariantToken } from './SpaceVariantToken';

const meta = {
  title: 'Datalayer/Tokens/SpaceVariantToken',
  component: SpaceVariantToken,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Token: ({ text, leadingVisual: Icon }) => (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d1d9e0',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#24292f',
                }}
              >
                {Icon && <Icon size={12} />}
                {text}
              </span>
            ),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            ProjectIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M1.75 0A1.75 1.75 0 000 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0016 14.25V1.75A1.75 1.75 0 0014.25 0H1.75zM1.5 1.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V1.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v7.5a.75.75 0 01-1.5 0v-7.5zM8 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5A.75.75 0 008 3z" />
              </svg>
            ),
          },
        },
        {
          path: '@datalayer/icons-react',
          default: {
            StudentIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 4a.5.5 0 01.5.5V6h3a.5.5 0 010 1h-3v1.5a.5.5 0 01-1 0V7h-3a.5.5 0 010-1h3V4.5A.5.5 0 018 4z" />
                <path
                  fillRule="evenodd"
                  d="M8 1a7 7 0 100 14A7 7 0 008 1zM2 8a6 6 0 1112 0A6 6 0 012 8z"
                />
              </svg>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'course'],
      description: 'Space variant type',
    },
  },
} satisfies Meta<typeof SpaceVariantToken>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};

export const Course: Story = {
  args: {
    variant: 'course',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div>
        <div
          style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}
        >
          Default Space:
        </div>
        <SpaceVariantToken variant="default" />
      </div>
      <div>
        <div
          style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}
        >
          Course Space:
        </div>
        <SpaceVariantToken variant="course" />
      </div>
    </div>
  ),
};

export const InList: Story = {
  render: () => (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Space Types</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
          }}
        >
          <span>My Data Science Project</span>
          <SpaceVariantToken variant="default" />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
          }}
        >
          <span>Machine Learning 101</span>
          <SpaceVariantToken variant="course" />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
          }}
        >
          <span>Personal Workspace</span>
          <SpaceVariantToken variant="default" />
        </div>
      </div>
    </div>
  ),
};
