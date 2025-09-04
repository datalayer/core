/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { DownloadJsonButton } from './DownloadJsonButton';

const meta = {
  title: 'Datalayer/Buttons/DownloadJsonButton',
  component: DownloadJsonButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'invisible', 'danger', 'link'],
    },
    extension: {
      control: 'select',
      options: ['json', 'yaml', 'xml'],
    },
  },
} satisfies Meta<typeof DownloadJsonButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData = {
  project: 'Datalayer Core',
  version: '0.0.3',
  components: ['buttons', 'banners', 'notebooks'],
  metadata: {
    created: '2023-01-01',
    updated: '2025-01-01',
  },
};

export const Default: Story = {
  args: {
    data: sampleData,
    fileName: 'project-data',
    extension: 'json',
    variant: 'default',
  },
};

export const Primary: Story = {
  args: {
    data: sampleData,
    fileName: 'project-data',
    extension: 'json',
    variant: 'primary',
  },
};

export const YamlExport: Story = {
  args: {
    data: sampleData,
    fileName: 'project-data',
    extension: 'yaml',
    variant: 'default',
  },
};

export const NoData: Story = {
  args: {
    fileName: 'empty-data',
    extension: 'json',
    variant: 'default',
  },
};
