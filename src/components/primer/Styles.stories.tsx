/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Styles } from './Styles';

const meta = {
  title: 'Datalayer/Primer/Styles',
  component: Styles,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Provides Primer theme and base styles using JupyterLab theme configuration.',
      },
    },
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            ThemeProvider: ({ children, theme }) => (
              <div data-theme="jupyter-lab" style={{ padding: '1rem' }}>
                Theme: {theme?.name || 'JupyterLab'}
                {children}
              </div>
            ),
            BaseStyles: () => (
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  /* Mock base styles */
                  .primer-base-styles {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    color: #24292f;
                    background: #ffffff;
                  }
                `,
                }}
              />
            ),
          },
        },
        {
          path: '@datalayer/jupyter-react',
          default: {
            jupyterLabTheme: {
              name: 'JupyterLab',
              colorScheme: 'light',
              colors: {
                primary: '#0969da',
                secondary: '#656d76',
              },
            },
          },
        },
      ],
    },
  },
} satisfies Meta<typeof Styles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithContent: Story = {
  render: () => (
    <div>
      <Styles />
      <div
        style={{
          padding: '2rem',
          border: '1px solid #d1d9e0',
          borderRadius: '8px',
          marginTop: '1rem',
        }}
      >
        <h2>Styled Content</h2>
        <p>
          This content should inherit the base Primer styles and JupyterLab
          theme.
        </p>
        <button
          style={{
            background: '#0969da',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Themed Button
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how the Styles component applies theming to content.',
      },
    },
  },
};
