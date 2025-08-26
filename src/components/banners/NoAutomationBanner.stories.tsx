/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { NoAutomationBanner } from './NoAutomationBanner';

const meta = {
  title: 'Datalayer/Banners/NoAutomationBanner',
  component: NoAutomationBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof NoAutomationBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
