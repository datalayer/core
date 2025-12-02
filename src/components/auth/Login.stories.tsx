/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../utils/cli/query';
import { Login } from './Login';

/**
 * Login component provides a comprehensive authentication interface with multiple methods:
 * - Email/password authentication
 * - OAuth (GitHub, LinkedIn)
 * - Direct token input
 *
 * The component includes form validation, loading states, and error handling.
 */
const meta = {
  title: 'Components/Auth/Login',
  component: Login,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Story />
        </BrowserRouter>
      </QueryClientProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Login>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default login form with all authentication methods enabled
 */
export const Default: Story = {
  args: {
    heading: 'Login to Datalayer',
    homeRoute: '/home',
    loginRoute: '/login',
    showEmailLogin: true,
    showGitHubLogin: true,
    showTokenLogin: true,
  },
};

/**
 * Login form with only email/password authentication
 */
export const EmailOnly: Story = {
  args: {
    heading: 'Login to Datalayer',
    homeRoute: '/home',
    loginRoute: '/login',
    showEmailLogin: true,
    showGitHubLogin: false,
    showTokenLogin: false,
  },
};

/**
 * Login form with only OAuth authentication
 */
export const OAuthOnly: Story = {
  args: {
    heading: 'Login to Datalayer',
    homeRoute: '/home',
    loginRoute: '/login',
    showEmailLogin: false,
    showGitHubLogin: true,
    showTokenLogin: false,
  },
};

/**
 * Login form with only token authentication
 */
export const TokenOnly: Story = {
  args: {
    heading: 'Login to Datalayer',
    homeRoute: '/home',
    loginRoute: '/login',
    showEmailLogin: false,
    showGitHubLogin: false,
    showTokenLogin: true,
  },
};

/**
 * Login form with custom heading
 */
export const CustomHeading: Story = {
  args: {
    heading: 'Welcome Back!',
    homeRoute: '/home',
    loginRoute: '/login',
    showEmailLogin: true,
    showGitHubLogin: true,
    showTokenLogin: true,
  },
};

/**
 * Login form with all authentication methods including password reset link
 */
export const WithPasswordReset: Story = {
  args: {
    heading: 'Login to Datalayer',
    homeRoute: '/home',
    loginRoute: '/login',
    passwordRoute: '/password-reset',
    showEmailLogin: true,
    showGitHubLogin: true,
    showTokenLogin: true,
  },
};
