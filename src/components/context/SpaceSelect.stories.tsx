/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { SpaceSelect } from './SpaceSelect';

// Mock dependencies
const meta = {
  title: 'Datalayer/Context/SpaceSelect',
  component: SpaceSelect,
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
              refreshUserSpaces: () => Promise.resolve({ success: true }),
              getUserSpaces: () => [
                { id: '1', name: 'Personal Space' },
                { id: '2', name: 'Team Space' },
                { id: '3', name: 'Project Space' },
              ],
              refreshOrganizationSpaces: () =>
                Promise.resolve({ success: true }),
              getOrganizationSpaces: () => [
                { id: '1', name: 'Org Space 1' },
                { id: '2', name: 'Org Space 2' },
              ],
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              organization: undefined,
              space: undefined,
              updateLayoutSpace: () => {},
            }),
          },
        },
      ],
    },
  },
} satisfies Meta<typeof SpaceSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithOrganization: Story = {
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
              refreshUserSpaces: () => Promise.resolve({ success: true }),
              getUserSpaces: () => [
                { id: '1', name: 'Personal Space' },
                { id: '2', name: 'Team Space' },
              ],
              refreshOrganizationSpaces: () =>
                Promise.resolve({ success: true }),
              getOrganizationSpaces: () => [
                { id: '1', name: 'Org Space 1' },
                { id: '2', name: 'Org Space 2' },
                { id: '3', name: 'Org Space 3' },
              ],
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              organization: { id: '1', name: 'Test Organization' },
              space: undefined,
              updateLayoutSpace: () => {},
            }),
          },
        },
      ],
    },
  },
};

export const WithSelectedSpace: Story = {
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
              refreshUserSpaces: () => Promise.resolve({ success: true }),
              getUserSpaces: () => [
                { id: '1', name: 'Personal Space' },
                { id: '2', name: 'Team Space' },
                { id: '3', name: 'Project Space' },
              ],
              refreshOrganizationSpaces: () =>
                Promise.resolve({ success: true }),
              getOrganizationSpaces: () => [
                { id: '1', name: 'Org Space 1' },
                { id: '2', name: 'Org Space 2' },
              ],
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useLayoutStore: () => ({
              organization: undefined,
              space: { id: '1', name: 'Personal Space' },
              updateLayoutSpace: () => {},
            }),
          },
        },
      ],
    },
  },
};
