/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScreenCapture } from './ScreenCapture';

const meta = {
  title: 'Datalayer/Screenshot/ScreenCapture',
  component: ScreenCapture,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Screen capture component that allows users to select and capture areas of the screen using html2canvas.',
      },
    },
    mockAddonConfigs: {
      globalMockData: [
        {
          path: 'html2canvas',
          default: (element, options) => {
            console.log('Mock html2canvas called with:', element, options);
            // Create a mock canvas
            const canvas = document.createElement('canvas');
            canvas.width = options?.width || 800;
            canvas.height = options?.height || 600;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Draw a simple mock screenshot
              ctx.fillStyle = '#f6f8fa';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#0366d6';
              ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
              ctx.fillStyle = '#ffffff';
              ctx.font = '20px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(
                'Mock Screenshot',
                canvas.width / 2,
                canvas.height / 2,
              );
            }
            return Promise.resolve(canvas);
          },
        },
      ],
    },
  },
  argTypes: {
    onEndCapture: {
      action: 'screenshot captured',
      description: 'Callback when screenshot is captured',
    },
    onStartCapture: {
      action: 'screenshot started',
      description: 'Callback when screenshot starts',
    },
  },
} satisfies Meta<typeof ScreenCapture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithButton: Story = {
  args: {
    onEndCapture: url => {
      console.log('Screenshot captured:', url);
    },
    onStartCapture: () => {
      console.log('Screenshot started');
    },
  },
  render: args => (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <ScreenCapture {...args}>
        {({ onStartCapture }) => (
          <button
            onClick={onStartCapture}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#0366d6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Start Screen Capture
          </button>
        )}
      </ScreenCapture>
      <div
        style={{
          marginTop: '2rem',
          padding: '2rem',
          backgroundColor: '#f6f8fa',
          border: '1px solid #d1d9e0',
          borderRadius: '8px',
        }}
      >
        <h2>Sample Content to Capture</h2>
        <p>This is some content that can be captured in a screenshot.</p>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#e1f5fe',
              borderRadius: '4px',
              flex: 1,
            }}
          >
            <h3>Box 1</h3>
            <p>Some content here</p>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fff3e0',
              borderRadius: '4px',
              flex: 1,
            }}
          >
            <h3>Box 2</h3>
            <p>More content here</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const WithCustomTrigger: Story = {
  args: {
    onEndCapture: url => {
      console.log('Screenshot captured:', url);
      // Create a preview element
      const img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '300px';
      img.style.border = '2px solid #0366d6';
      img.style.borderRadius = '8px';
      img.style.marginTop = '1rem';

      // Find or create preview container
      let preview = document.getElementById('screenshot-preview');
      if (!preview) {
        preview = document.createElement('div');
        preview.id = 'screenshot-preview';
        preview.style.position = 'fixed';
        preview.style.top = '20px';
        preview.style.right = '20px';
        preview.style.zIndex = '1000';
        preview.style.background = 'white';
        preview.style.padding = '1rem';
        preview.style.border = '1px solid #d1d9e0';
        preview.style.borderRadius = '8px';
        preview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        document.body.appendChild(preview);
      }
      preview.innerHTML = '<h4>Captured Screenshot:</h4>';
      preview.appendChild(img);
    },
  },
  render: args => (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <ScreenCapture {...args}>
        {({ onStartCapture }) => (
          <div style={{ textAlign: 'center' }}>
            <h1>Screen Capture Demo</h1>
            <p>Click the button below to start capturing a screenshot</p>
            <button
              onClick={onStartCapture}
              style={{
                padding: '16px 32px',
                fontSize: '18px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              📷 Capture Screenshot
            </button>
          </div>
        )}
      </ScreenCapture>

      <div
        style={{
          marginTop: '3rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}
      >
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              padding: '1.5rem',
              backgroundColor: `hsl(${i * 60}, 70%, 95%)`,
              border: `2px solid hsl(${i * 60}, 70%, 80%)`,
              borderRadius: '8px',
            }}
          >
            <h3>Card {i}</h3>
            <p>This is sample content in card {i} that can be captured.</p>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: `hsl(${i * 60}, 70%, 50%)`,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Action {i}
            </button>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const FunctionAsChildren: Story = {
  args: {
    children: ({ onStartCapture }) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
          border: '2px dashed #d1d9e0',
          borderRadius: '8px',
          backgroundColor: '#f6f8fa',
        }}
      >
        <span>📸</span>
        <span>Ready to capture screen?</span>
        <button
          onClick={onStartCapture}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Start
        </button>
      </div>
    ),
    onEndCapture: url => console.log('Captured:', url.slice(0, 50) + '...'),
  },
};
