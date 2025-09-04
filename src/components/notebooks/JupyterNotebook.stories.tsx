/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { BoxPanel } from '@lumino/widgets';

import { JupyterNotebook } from './JupyterNotebook';

// Mock BoxPanel for Storybook
const createMockBoxPanel = () => {
  const boxPanel = new BoxPanel();
  boxPanel.title.label = 'Mock Notebook';
  return boxPanel;
};

const meta = {
  title: 'Datalayer/Notebooks/JupyterNotebook',
  component: JupyterNotebook,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, ...props }) => <div {...props}>{children}</div>,
          },
        },
        {
          path: '@datalayer/jupyter-react',
          default: {
            Lumino: ({ children }) => (
              <div
                style={{
                  width: '100%',
                  height: '400px',
                  border: '1px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f6f8fa',
                  color: '#666',
                }}
              >
                Mock Jupyter Notebook Panel:{' '}
                {children?.title?.label || 'Untitled'}
              </div>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    height: {
      control: 'text',
      description: 'Height of the notebook component',
    },
  },
} satisfies Meta<typeof JupyterNotebook>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    boxPanel: createMockBoxPanel(),
    height: '100%',
  },
};

export const FixedHeight: Story = {
  args: {
    boxPanel: createMockBoxPanel(),
    height: '500px',
  },
};

export const CustomHeight: Story = {
  args: {
    boxPanel: createMockBoxPanel(),
    height: '300px',
  },
};

export const TallNotebook: Story = {
  args: {
    boxPanel: createMockBoxPanel(),
    height: '800px',
  },
};

export const CompactNotebook: Story = {
  args: {
    boxPanel: createMockBoxPanel(),
    height: '200px',
  },
};
