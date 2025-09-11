/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserProfileAvatar } from './UserProfileAvatar';

const meta = {
  title: 'Datalayer/UserProfileAvatar',
  component: UserProfileAvatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof UserProfileAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    user: {
      id: '1',
      username: 'johndoe',
      email: 'john@example.com',
      avatarUrl: 'https://github.com/octocat.png',
      firstName: 'John',
      lastName: 'Doe',
    },
    size: 100,
  },
};

export const WithClick: Story = {
  args: {
    user: {
      id: '1',
      username: 'johndoe',
      email: 'john@example.com',
      avatarUrl: 'https://github.com/octocat.png',
      firstName: 'John',
      lastName: 'Doe',
    },
    size: 100,
    onClick: () => alert('Avatar clicked!'),
  },
};

export const SmallSize: Story = {
  args: {
    user: {
      id: '1',
      username: 'johndoe',
      email: 'john@example.com',
      avatarUrl: 'https://github.com/octocat.png',
      firstName: 'John',
      lastName: 'Doe',
    },
    size: 40,
  },
};

export const Loading: Story = {
  args: {
    user: undefined,
    size: 100,
  },
};
