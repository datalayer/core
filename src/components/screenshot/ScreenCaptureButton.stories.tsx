/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScreenCaptureButton } from './ScreenCaptureButton';

const meta = {
  title: 'Datalayer/Screenshot/ScreenCaptureButton',
  component: ScreenCaptureButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A ready-to-use screen capture button with tooltip and toast notifications.',
      },
    },
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Link: ({ children, onClick, sx, href, ...props }) => (
              <a
                {...props}
                href={href}
                onClick={onClick}
                style={{
                  textDecoration: 'none',
                  color: sx?.color || '#656d76',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '4px',
                  transition: 'color 0.2s',
                  ...sx,
                }}
              >
                {children}
              </a>
            ),
            Tooltip: ({ children, text, direction }) => (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {children}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#24292f',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s',
                    zIndex: 1000,
                  }}
                  className="tooltip-text"
                >
                  {text}
                </div>
              </div>
            ),
            Button: ({ children, variant, ...props }) => (
              <button
                {...props}
                style={{
                  background:
                    variant === 'invisible' ? 'transparent' : '#f6f8fa',
                  border:
                    variant === 'invisible' ? 'none' : '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {children}
              </button>
            ),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            ScreenFullIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M5.75 0A.75.75 0 016.5.75v1.5a.75.75 0 01-1.5 0V1.25H1.75a.75.75 0 010-1.5h4zm4.5 0h4a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0V1.25h-3.25a.75.75 0 010-1.5zM.75 10.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H1.25v3.25a.75.75 0 01-1.5 0v-4zm14.5 0v4a.75.75 0 01-.75.75h-4a.75.75 0 010-1.5h3.25V10.25a.75.75 0 011.5 0z" />
              </svg>
            ),
          },
        },
        {
          path: '../../utils',
          default: {
            lazyWithPreload: importFn => importFn,
            WithSuspense: Component => Component,
          },
        },
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message, options) => {
                console.log('Toast:', message, options);
                // Create a mock toast notification
                const toast = document.createElement('div');
                toast.style.position = 'fixed';
                toast.style.top = '20px';
                toast.style.right = '20px';
                toast.style.padding = '12px 16px';
                toast.style.backgroundColor =
                  options?.variant === 'success' ? '#28a745' : '#0366d6';
                toast.style.color = 'white';
                toast.style.borderRadius = '6px';
                toast.style.zIndex = '1001';
                toast.textContent = message;
                document.body.appendChild(toast);
                setTimeout(() => {
                  if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                  }
                }, 3000);
              },
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              setScreenCapture: capture => {
                console.log('Screen capture stored:', capture);
                // Store in sessionStorage for demo
                sessionStorage.setItem('datalayer-screenshot', capture);
              },
              hideScreenshot: () => {
                console.log('Screenshot hidden');
              },
            }),
          },
        },
        {
          path: '../screenshot/ScreenCapture',
          default: ({ children, onEndCapture, onStartCapture }) => {
            const handleClick = () => {
              if (onStartCapture) onStartCapture();
              // Simulate capturing after a short delay
              setTimeout(() => {
                // Create a mock data URL
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 300;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#f6f8fa';
                  ctx.fillRect(0, 0, 400, 300);
                  ctx.fillStyle = '#0366d6';
                  ctx.fillRect(20, 20, 360, 260);
                  ctx.fillStyle = '#ffffff';
                  ctx.font = '16px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('Mock Screenshot', 200, 150);
                }
                onEndCapture(canvas.toDataURL());
              }, 500);
            };

            if (typeof children === 'function') {
              return children({ onStartCapture: handleClick });
            }
            return children;
          },
        },
      ],
    },
  },
} satisfies Meta<typeof ScreenCaptureButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InToolbar: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#f6f8fa',
        border: '1px solid #d1d9e0',
        borderRadius: '8px',
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Toolbar:</span>
      <button
        style={{
          padding: '6px 12px',
          border: '1px solid #d1d9e0',
          borderRadius: '4px',
          background: 'white',
        }}
      >
        Save
      </button>
      <button
        style={{
          padding: '6px 12px',
          border: '1px solid #d1d9e0',
          borderRadius: '4px',
          background: 'white',
        }}
      >
        Export
      </button>
      <ScreenCaptureButton />
      <button
        style={{
          padding: '6px 12px',
          border: '1px solid #d1d9e0',
          borderRadius: '4px',
          background: 'white',
        }}
      >
        Settings
      </button>
    </div>
  ),
};

export const WithContent: Story = {
  render: () => (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f6f8fa',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <ScreenCaptureButton />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#e1f5fe',
            border: '1px solid #0366d6',
            borderRadius: '8px',
          }}
        >
          <h3>Analytics</h3>
          <p>View your data insights</p>
          <div
            style={{
              height: '100px',
              backgroundColor: 'white',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#656d76',
            }}
          >
            Chart Placeholder
          </div>
        </div>

        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#fff3e0',
            border: '1px solid #f66a0a',
            borderRadius: '8px',
          }}
        >
          <h3>Reports</h3>
          <p>Generate and view reports</p>
          <div
            style={{
              height: '100px',
              backgroundColor: 'white',
              border: '1px solid #d1d9e0',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#656d76',
            }}
          >
            Table Placeholder
          </div>
        </div>
      </div>

      <p style={{ color: '#656d76', fontSize: '14px' }}>
        Click the screen capture button in the top-right corner to capture this
        content.
      </p>
    </div>
  ),
};

export const MultipleButtons: Story = {
  render: () => (
    <div style={{ padding: '2rem' }}>
      <h2>Multiple Screen Capture Buttons</h2>
      <p>Each button works independently:</p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
          }}
        >
          <span>Header Section</span>
          <ScreenCaptureButton />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
          }}
        >
          <span>Content Section</span>
          <ScreenCaptureButton />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
          }}
        >
          <span>Footer Section</span>
          <ScreenCaptureButton />
        </div>
      </div>
    </div>
  ),
};
