/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { AssignmentEditorToolbar } from './AssignmentEditorToolbar';

const meta = {
  title: 'Datalayer/Toolbars/AssignmentEditorToolbar',
  component: AssignmentEditorToolbar,
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
                    variant === 'danger'
                      ? '#da3633'
                      : variant === 'invisible'
                        ? 'transparent'
                        : '#0969da',
                  color:
                    variant === 'danger'
                      ? 'white'
                      : variant === 'invisible'
                        ? '#24292f'
                        : 'white',
                  border:
                    variant === 'danger'
                      ? '1px solid #da3633'
                      : variant === 'invisible'
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
            PlayIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="M6.271 5.055a.5.5 0 0 1 .52.26L9.5 8l-2.709 2.685a.5.5 0 0 1-.791-.407V5.722a.5.5 0 0 1 .271-.667z" />
              </svg>
            ),
            StopIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4.47 7.47a.75.75 0 0 1 1.06 0L8 9.94l2.47-2.47a.75.75 0 1 1 1.06 1.06L9.06 11l2.47 2.47a.75.75 0 1 1-1.06 1.06L8 12.06l-2.47 2.47a.75.75 0 0 1-1.06-1.06L6.94 11 4.47 8.53a.75.75 0 0 1 0-1.06z" />
              </svg>
            ),
          },
        },
        {
          path: '@datalayer/jupyter-react',
          default: {
            notebookStore: {
              getState: () => ({
                selectNotebook: id => ({
                  id,
                  kernelStatus: 'idle', // Will be overridden by story args
                }),
                runAll: id => console.log('Running all cells in notebook:', id),
                interrupt: id => console.log('Interrupting notebook:', id),
              }),
            },
          },
        },
        {
          path: '../../state',
          default: {
            useGradeStore: () => ({
              grade: date => console.log('Grading assignment at:', date),
            }),
          },
        },
      ],
    },
  },
  argTypes: {
    notebookId: {
      control: 'text',
      description: 'ID of the notebook',
    },
  },
} satisfies Meta<typeof AssignmentEditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Create a wrapper component to control notebook state
const ToolbarWrapper = ({ notebookId, kernelStatus = 'idle' }) => {
  // Mock the notebook store to return different kernel statuses
  const originalGetState = (window as any).__mockNotebookStore?.getState;
  (window as any).__mockNotebookStore = {
    getState: () => ({
      selectNotebook: id => ({
        id,
        kernelStatus,
      }),
      runAll: id => console.log('Running all cells in notebook:', id),
      interrupt: id => console.log('Interrupting notebook:', id),
    }),
  };

  // Update the mock in the story context
  if (typeof window !== 'undefined' && (window as any).mockAddonConfigs) {
    const jupyterReactMock = (window as any).mockAddonConfigs.find(
      config => config.path === '@datalayer/jupyter-react',
    );
    if (jupyterReactMock) {
      jupyterReactMock.default.notebookStore.getState = () => ({
        selectNotebook: id => ({
          id,
          kernelStatus,
        }),
        runAll: id => console.log('Running all cells in notebook:', id),
        interrupt: id => console.log('Interrupting notebook:', id),
      });
    }
  }

  return <AssignmentEditorToolbar notebookId={notebookId} />;
};

export const Default: Story = {
  render: args => <ToolbarWrapper {...args} kernelStatus="idle" />,
  args: {
    notebookId: 'notebook-123',
  },
};

export const KernelBusy: Story = {
  render: args => <ToolbarWrapper {...args} kernelStatus="busy" />,
  args: {
    notebookId: 'notebook-123',
  },
};

export const KernelIdle: Story = {
  render: args => <ToolbarWrapper {...args} kernelStatus="idle" />,
  args: {
    notebookId: 'notebook-123',
  },
};

export const KernelStarting: Story = {
  render: args => <ToolbarWrapper {...args} kernelStatus="starting" />,
  args: {
    notebookId: 'notebook-123',
  },
};

export const InteractiveDemo: Story = {
  render: args => {
    return (
      <div style={{ padding: '16px' }}>
        <h3>Assignment Editor Toolbar Demo</h3>
        <div style={{ marginBottom: '16px' }}>
          <h4>Idle State (shows Grade + Run All):</h4>
          <ToolbarWrapper {...args} kernelStatus="idle" />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <h4>Busy State (shows Grade + Interrupt):</h4>
          <ToolbarWrapper {...args} kernelStatus="busy" />
        </div>
        <div>
          <p>
            <small>Click buttons to see console output</small>
          </p>
        </div>
      </div>
    );
  },
  args: {
    notebookId: 'demo-notebook',
  },
};
