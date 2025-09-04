/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { ArtifactIcon } from './ArtifactIcon';

const meta = {
  title: 'Datalayer/Icons/ArtifactIcon',
  component: ArtifactIcon,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: [
        'assignment',
        'authoring',
        'cell',
        'content',
        'credits',
        'dataset',
        'datasource',
        'document',
        'documentation',
        'environment',
        'exercise',
        'growth',
        'home',
        'invite',
        'runtime',
        'runtime-snapshot',
        'library',
        'lesson',
        'mail',
        'management',
        'notebook',
        'organization',
        'onboarding',
        'page',
        'settings',
        'share',
        'space',
        'success',
        'support',
        'storage',
        'tag',
        'team',
        'usage',
        'user',
        'undefined',
      ],
      description: 'Type of artifact to display icon for',
    },
    size: {
      control: { type: 'select' },
      options: [16, 24, 32, 'small', 'medium', 'large'],
      description: 'Size of the icon',
    },
  },
} satisfies Meta<typeof ArtifactIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'notebook',
  },
};

export const Assignment: Story = {
  args: {
    type: 'assignment',
    size: 24,
  },
};

export const Runtime: Story = {
  args: {
    type: 'runtime',
    size: 32,
  },
};

export const WithItem: Story = {
  args: {
    item: {
      id: '1',
      type: 'space',
      name: 'My Space',
    },
    size: 24,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <ArtifactIcon type="notebook" size={16} />
      <ArtifactIcon type="notebook" size={24} />
      <ArtifactIcon type="notebook" size={32} />
      <ArtifactIcon type="notebook" size="small" />
      <ArtifactIcon type="notebook" size="medium" />
      <ArtifactIcon type="notebook" size="large" />
    </div>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '16px',
        padding: '20px',
      }}
    >
      {[
        'assignment',
        'authoring',
        'cell',
        'content',
        'credits',
        'dataset',
        'datasource',
        'document',
        'documentation',
        'environment',
        'exercise',
        'growth',
        'home',
        'invite',
        'runtime',
        'runtime-snapshot',
        'library',
        'lesson',
        'mail',
        'management',
        'notebook',
        'organization',
        'onboarding',
        'page',
        'settings',
        'share',
        'space',
        'success',
        'support',
        'storage',
        'tag',
        'team',
        'usage',
        'user',
        'undefined',
      ].map(type => (
        <div key={type} style={{ textAlign: 'center' }}>
          <ArtifactIcon type={type as any} size={24} />
          <div style={{ fontSize: '12px', marginTop: '4px' }}>{type}</div>
        </div>
      ))}
    </div>
  ),
};
