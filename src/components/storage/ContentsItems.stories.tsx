/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { DirectoryItem, TreeItem, modelToView } from './ContentsItems';
import type { IContentsView } from './ContentsItems';
import type { Contents } from '@jupyterlab/services';

const meta = {
  title: 'Datalayer/Storage/ContentsItems',
  component: DirectoryItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            TreeView: {
              Item: ({ children, current, onSelect, id, ...props }) => (
                <div
                  {...props}
                  style={{
                    padding: '4px 8px',
                    cursor: 'pointer',
                    backgroundColor: current ? '#f1f8ff' : 'transparent',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '2px 0',
                  }}
                  onClick={onSelect}
                >
                  {children}
                </div>
              ),
              SubTree: ({ children, ...props }) => (
                <div {...props} style={{ marginLeft: '16px' }}>
                  {children}
                </div>
              ),
              LeadingVisual: ({ children, ...props }) => (
                <span
                  {...props}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  {children}
                </span>
              ),
            },
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            FileIcon: () => (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177L10.513 1.573a.25.25 0 00-.177-.073H3.75z" />
              </svg>
            ),
          },
        },
      ],
    },
  },
  argTypes: {},
} satisfies Meta<typeof DirectoryItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock contents manager
const createMockContents = (path: string = ''): Contents.IManager => {
  const mockContents: { [key: string]: Contents.IModel } = {
    '': {
      name: '',
      path: '',
      type: 'directory',
      created: '2023-01-01T00:00:00Z',
      last_modified: '2023-01-01T00:00:00Z',
      mimetype: '',
      content: [
        {
          name: 'notebooks',
          path: 'notebooks',
          type: 'directory',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: '',
          content: null,
          writable: true,
          format: 'json',
        },
        {
          name: 'data',
          path: 'data',
          type: 'directory',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: '',
          content: null,
          writable: true,
          format: 'json',
        },
        {
          name: 'example.ipynb',
          path: 'example.ipynb',
          type: 'notebook',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: 'application/x-ipynb+json',
          content: null,
          writable: true,
          format: 'json',
        },
        {
          name: 'README.md',
          path: 'README.md',
          type: 'file',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: 'text/markdown',
          content: null,
          writable: true,
          format: 'text',
        },
      ],
      writable: true,
      format: 'json',
    },
    notebooks: {
      name: 'notebooks',
      path: 'notebooks',
      type: 'directory',
      created: '2023-01-01T00:00:00Z',
      last_modified: '2023-01-01T00:00:00Z',
      mimetype: '',
      content: [
        {
          name: 'analysis.ipynb',
          path: 'notebooks/analysis.ipynb',
          type: 'notebook',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: 'application/x-ipynb+json',
          content: null,
          writable: true,
          format: 'json',
        },
        {
          name: 'visualization.ipynb',
          path: 'notebooks/visualization.ipynb',
          type: 'notebook',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: 'application/x-ipynb+json',
          content: null,
          writable: true,
          format: 'json',
        },
      ],
      writable: true,
      format: 'json',
    },
    data: {
      name: 'data',
      path: 'data',
      type: 'directory',
      created: '2023-01-01T00:00:00Z',
      last_modified: '2023-01-01T00:00:00Z',
      mimetype: '',
      content: [
        {
          name: 'dataset.csv',
          path: 'data/dataset.csv',
          type: 'file',
          created: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-01T00:00:00Z',
          mimetype: 'text/csv',
          content: null,
          writable: true,
          format: 'text',
        },
      ],
      writable: true,
      format: 'json',
    },
  };

  return {
    get: async (path: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockContents[path] || mockContents[''];
    },
  } as any;
};

// Mock document registry
const mockDocumentRegistry = {
  getFileTypeForModel: (model: Contents.IModel) => {
    if (model.type === 'directory') {
      return {
        name: 'directory',
        icon: {
          react: () => (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.75 2.5h4.5L8 4.25h6.25a1.75 1.75 0 011.75 1.75v7a1.75 1.75 0 01-1.75 1.75H1.75A1.75 1.75 0 010 13V4.25a1.75 1.75 0 011.75-1.75z" />
            </svg>
          ),
        },
      };
    }
    if (model.name?.endsWith('.ipynb')) {
      return {
        name: 'notebook',
        icon: {
          react: () => (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25H1.75zM3.5 6.25a.75.75 0 01.75-.75h7a.75.75 0 010 1.5h-7a.75.75 0 01-.75-.75zm.75 2.25h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
            </svg>
          ),
        },
      };
    }
    return {
      name: 'file',
      icon: {
        react: () => (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177L10.513 1.573a.25.25 0 00-.177-.073H3.75z" />
          </svg>
        ),
      },
    };
  },
} as any;

const InteractiveTemplate = args => {
  const [current, setCurrent] = useState<IContentsView | null>(null);
  const contents = createMockContents();

  const handleSelect = (item: IContentsView, refresh?: () => void) => {
    setCurrent(item);
    console.log('Selected item:', item);
    if (refresh) refresh();
  };

  const handleContextMenu = ref => {
    console.log('Context menu requested for:', ref.current);
  };

  return (
    <div style={{ width: '300px', padding: '16px' }}>
      <DirectoryItem
        {...args}
        contents={contents}
        current={current}
        documentRegistry={mockDocumentRegistry}
        onSelect={handleSelect}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};

export const RootDirectory: Story = {
  render: InteractiveTemplate,
  args: {
    item: {
      name: '',
      path: '',
      type: 'directory',
      created: '2023-01-01T00:00:00Z',
      last_modified: '2023-01-01T00:00:00Z',
      mimetype: '',
      content: null,
      writable: true,
      format: 'json',
    },
  },
};

export const SubDirectory: Story = {
  render: InteractiveTemplate,
  args: {
    item: {
      name: 'notebooks',
      path: 'notebooks',
      type: 'directory',
      created: '2023-01-01T00:00:00Z',
      last_modified: '2023-01-01T00:00:00Z',
      mimetype: '',
      content: null,
      writable: true,
      format: 'json',
    },
  },
};

// Single TreeItem story
export const SingleFileItem: Story = {
  render: args => {
    const [current, setCurrent] = useState(false);

    const handleSelect = (item: IContentsView) => {
      setCurrent(true);
      console.log('Selected item:', item);
    };

    const handleContextMenu = ref => {
      console.log('Context menu requested for:', ref.current);
    };

    return (
      <div style={{ width: '300px', padding: '16px' }}>
        <TreeItem
          item={args.item}
          current={current}
          onSelect={handleSelect}
          onContextMenu={handleContextMenu}
        />
      </div>
    );
  },
  args: {
    item: {
      name: 'example.ipynb',
      path: 'example.ipynb',
      type: 'notebook',
      created: '2023-01-01T00:00:00Z',
      last_modified: '2023-01-01T00:00:00Z',
      mimetype: 'application/x-ipynb+json',
      content: null,
      writable: true,
      format: 'json',
      fileType: {
        name: 'notebook',
        icon: {
          react: () => (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75z" />
            </svg>
          ),
        },
      },
    },
  },
};

export const ModelToViewUtility: Story = {
  render: () => {
    const mockModels: Contents.IModel[] = [
      {
        name: 'data.csv',
        path: 'data.csv',
        type: 'file',
        created: '2023-01-01T00:00:00Z',
        last_modified: '2023-01-01T00:00:00Z',
        mimetype: 'text/csv',
        content: null,
        writable: true,
        format: 'text',
      },
      {
        name: 'notebooks',
        path: 'notebooks',
        type: 'directory',
        created: '2023-01-01T00:00:00Z',
        last_modified: '2023-01-01T00:00:00Z',
        mimetype: '',
        content: null,
        writable: true,
        format: 'json',
      },
      {
        name: '.hidden',
        path: '.hidden',
        type: 'file',
        created: '2023-01-01T00:00:00Z',
        last_modified: '2023-01-01T00:00:00Z',
        mimetype: '',
        content: null,
        writable: true,
        format: 'text',
      },
      {
        name: 'analysis.ipynb',
        path: 'analysis.ipynb',
        type: 'notebook',
        created: '2023-01-01T00:00:00Z',
        last_modified: '2023-01-01T00:00:00Z',
        mimetype: 'application/x-ipynb+json',
        content: null,
        writable: true,
        format: 'json',
      },
    ];

    const processed = modelToView(mockModels, mockDocumentRegistry);

    return (
      <div style={{ padding: '16px' }}>
        <h3>modelToView Utility Demo</h3>
        <p>
          Processes: {mockModels.length} items → {processed.length} visible
          items
        </p>
        <ul>
          {processed.map(item => (
            <li key={item.path}>
              {item.type === 'directory' ? '📁' : '📄'} {item.name}
            </li>
          ))}
        </ul>
        <p>
          <small>
            Note: Hidden files (.hidden) are filtered out, directories are
            sorted first
          </small>
        </p>
      </div>
    );
  },
  args: {},
};
