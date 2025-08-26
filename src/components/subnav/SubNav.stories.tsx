/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { SubNav } from './SubNav';

const meta = {
  title: 'Datalayer/SubNav/SubNav',
  component: SubNav,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react-brand',
          default: {
            Button: ({ children, variant, size, ...props }) => (
              <button
                {...props}
                style={{
                  padding: size === 'small' ? '6px 12px' : '8px 16px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  background: variant === 'primary' ? '#0366d6' : 'white',
                  color: variant === 'primary' ? 'white' : '#24292f',
                  cursor: 'pointer',
                }}
              >
                {children}
              </button>
            ),
            ButtonGroup: ({ children }) => (
              <div style={{ display: 'flex', gap: '8px' }}>{children}</div>
            ),
            Text: ({ children, ...props }) => (
              <span {...props}>{children}</span>
            ),
            ThemeProvider: ({ children }) => children,
            useWindowSize: () => ({ isMedium: true, isLarge: true }),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            ChevronDownIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M12.78 5.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 6.28a.75.75 0 011.06-1.06L8 8.94l3.72-3.72a.75.75 0 011.06 0z" />
              </svg>
            ),
            ChevronUpIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M3.22 10.78a.75.75 0 010-1.06L7.47 5.47a.75.75 0 011.06 0l4.25 4.25a.75.75 0 01-1.06 1.06L8 7.06 4.28 10.78a.75.75 0 01-1.06 0z" />
              </svg>
            ),
          },
        },
        {
          path: '../../hooks',
          default: {
            useId: prefix => `${prefix}-${Math.random().toString(36).slice(2)}`,
            useKeyboardEscape: () => {},
            useOnClickOutside: () => {},
            useProvidedRefOrCreate: () => ({ current: null }),
            useContainsFocus: () => false,
          },
        },
        {
          path: '../primer',
          default: {
            BaseProps: {},
          },
        },
      ],
    },
  },
} satisfies Meta<typeof SubNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f6f8fa',
          border: '1px solid #d1d9e0',
          borderRadius: '8px',
        }}
      >
        <h2>Mock SubNav Component</h2>
        <p>
          This is a placeholder for the SubNav component as it's a complex
          navigation component.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Home
          </button>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            About
          </button>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Services
          </button>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Contact
          </button>
        </div>
      </div>
    </div>
  ),
};

export const WithDropdown: Story = {
  render: () => (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f6f8fa',
          border: '1px solid #d1d9e0',
          borderRadius: '8px',
        }}
      >
        <h2>SubNav with Dropdown</h2>
        <p>Navigation component with dropdown functionality.</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Products
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.78 5.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 6.28a.75.75 0 011.06-1.06L8 8.94l3.72-3.72a.75.75 0 011.06 0z" />
            </svg>
          </button>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Solutions
          </button>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Resources
          </button>
        </div>
      </div>
    </div>
  ),
};
