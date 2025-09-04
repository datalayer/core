/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { JupyterNotebookToolbar } from './JupyterNotebookToolbar';

const meta = {
  title: 'Datalayer/Notebooks/JupyterNotebookToolbar',
  component: JupyterNotebookToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/icons-react',
          default: {
            CircleCurrentColorIcon: ({ style, ...props }) => (
              <div
                {...props}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: style?.color || 'currentColor',
                  display: 'inline-block',
                  marginRight: 4,
                }}
              />
            ),
            CircleGreenIcon: props => (
              <div
                {...props}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: '#28a745',
                  display: 'inline-block',
                  marginRight: 4,
                }}
              />
            ),
            CircleOrangeIcon: props => (
              <div
                {...props}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: '#fa7e17',
                  display: 'inline-block',
                  marginRight: 4,
                }}
              />
            ),
          },
        },
        {
          path: '@primer/react',
          default: {
            Text: ({ children, ...props }) => (
              <span {...props}>{children}</span>
            ),
          },
        },
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, sx, ...props }) => (
              <div
                {...props}
                style={{
                  ...props.style,
                  ...(props.display && { display: props.display }),
                  ...(props.m && { margin: `${props.m * 8}px` }),
                  ...(props.ml && { marginLeft: `${props.ml * 8}px` }),
                  ...(props.mb && { marginBottom: `${props.mb * 8}px` }),
                  ...(props.width && { width: props.width }),
                  ...(props.height && { height: props.height }),
                }}
              >
                {children}
              </div>
            ),
          },
        },
        {
          path: 'react-sparklines',
          default: {
            Sparklines: ({ children, data }) => (
              <svg
                width="100%"
                height="100%"
                style={{ border: '1px solid #ddd' }}
              >
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                >
                  Sparkline ({data?.length || 0} points)
                </text>
                {children}
              </svg>
            ),
            SparklinesBars: () => null,
            SparklinesLine: () => null,
            SparklinesReferenceLine: () => null,
          },
        },
        {
          path: '../../theme',
          default: {
            DatalayerThemeProvider: ({ children }) => children,
          },
        },
      ],
    },
  },
} satisfies Meta<typeof JupyterNotebookToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMockData: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Shows the notebook toolbar with mock sparkline data and cell status indicators.',
      },
    },
  },
};
