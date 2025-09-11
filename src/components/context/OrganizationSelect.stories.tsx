/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { OrganizationSelect } from './OrganizationSelect';

// Mock dependencies
const meta = {
  title: 'Datalayer/Context/OrganizationSelect',
  component: OrganizationSelect,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useUser: () => ({
              id: '1',
              name: 'Test User',
              email: 'test@example.com',
            }),
            useCache: () => ({
              refreshUserOrganizations: () =>
                Promise.resolve({ success: true }),
              getUserOrganizations: () => [
                { id: '1', name: 'Organization 1' },
                { id: '2', name: 'Organization 2' },
                { id: '3', name: 'Organization 3' },
              ],
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              organization: undefined,
              updateLayoutOrganization: () => {},
              updateLayoutSpace: () => {},
            }),
          },
        },
      ],
    },
  },
} satisfies Meta<typeof OrganizationSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelection: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useUser: () => ({
              id: '1',
              name: 'Test User',
              email: 'test@example.com',
            }),
            useCache: () => ({
              refreshUserOrganizations: () =>
                Promise.resolve({ success: true }),
              getUserOrganizations: () => [
                { id: '1', name: 'Organization 1' },
                { id: '2', name: 'Organization 2' },
                { id: '3', name: 'Organization 3' },
              ],
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              organization: { id: '1', name: 'Organization 1' },
              updateLayoutOrganization: () => {},
              updateLayoutSpace: () => {},
            }),
          },
        },
      ],
    },
  },
};

export const EmptyOrganizations: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useUser: () => ({
              id: '1',
              name: 'Test User',
              email: 'test@example.com',
            }),
            useCache: () => ({
              refreshUserOrganizations: () =>
                Promise.resolve({ success: true }),
              getUserOrganizations: () => [],
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              organization: undefined,
              updateLayoutOrganization: () => {},
              updateLayoutSpace: () => {},
            }),
          },
        },
      ],
    },
  },
};
