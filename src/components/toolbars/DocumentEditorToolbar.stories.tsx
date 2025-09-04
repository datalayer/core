/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DocumentEditorToolbar } from './DocumentEditorToolbar';

const meta = {
  title: 'Datalayer/Toolbars/DocumentEditorToolbar',
  component: DocumentEditorToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Button: ({
              children,
              onClick,
              variant = 'primary',
              size = 'medium',
              leadingVisual: LeadingVisual,
              ...props
            }) => (
              <button
                {...props}
                onClick={onClick}
                style={{
                  backgroundColor:
                    variant === 'invisible' ? 'transparent' : '#0969da',
                  color: variant === 'invisible' ? '#24292f' : 'white',
                  border:
                    variant === 'invisible'
                      ? '1px solid transparent'
                      : '1px solid #0969da',
                  borderRadius: '6px',
                  padding: size === 'small' ? '4px 8px' : '8px 16px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: size === 'small' ? '12px' : '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={e => {
                  if (variant === 'invisible') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={e => {
                  if (variant === 'invisible') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {LeadingVisual && <LeadingVisual size={16} />}
                {children}
              </button>
            ),
            Box: ({ children, display = 'block', ...props }) => (
              <div
                {...props}
                style={{
                  display,
                  ...props.style,
                }}
              >
                {children}
              </div>
            ),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            RepoPushIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v9a1.5 1.5 0 01-1.5 1.5H8.75v1.75a.75.75 0 01-1.5 0V13H2.5A1.5 1.5 0 011 11.5v-9zm1.5-.5a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-11z" />
                <path d="M8 4a.75.75 0 01.75.75v2.5h2.5a.75.75 0 010 1.5h-2.5v2.5a.75.75 0 01-1.5 0v-2.5h-2.5a.75.75 0 010-1.5h2.5v-2.5A.75.75 0 018 4z" />
              </svg>
            ),
          },
        },
        {
          path: '../../state',
          default: {
            documentStore: {
              getState: () => ({
                save: date => console.log('Saving document at:', date),
              }),
            },
          },
        },
      ],
    },
  },
  argTypes: {},
} satisfies Meta<typeof DocumentEditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InteractiveDemo: Story = {
  render: () => {
    return (
      <div style={{ padding: '16px' }}>
        <h3>Document Editor Toolbar Demo</h3>
        <div style={{ marginBottom: '16px' }}>
          <p>This toolbar provides document editing functionality.</p>
          <DocumentEditorToolbar />
        </div>
        <div>
          <p>
            <small>Click the Save button to see console output</small>
          </p>
        </div>
      </div>
    );
  },
  args: {},
};

export const InDocumentContext: Story = {
  render: () => {
    return (
      <div
        style={{
          border: '1px solid #d1d9e0',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: '#f6f8fa',
            borderBottom: '1px solid #d1d9e0',
            padding: '8px 12px',
          }}
        >
          <DocumentEditorToolbar />
        </div>
        <div style={{ padding: '16px' }}>
          <h4>Document Title</h4>
          <p>
            This is where the document content would appear. The toolbar above
            provides editing actions.
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </div>
    );
  },
  args: {},
};
