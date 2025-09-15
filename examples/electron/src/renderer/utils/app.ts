/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/utils/app
 * @description Application utility functions for user data processing and console filtering.
 */

import { GitHubUser } from '../../shared/types';
import { logger } from './logger';

/**
 * Extract GitHub user ID from handle string
 * @param userId - Handle in format "urn:dla:iam:ext::github:3627835"
 * @returns GitHub user ID number or null if not found
 */
export const extractGitHubId = (userId: string): number | null => {
  const match = userId.match(/github:(\d+)/);
  return match && match[1] ? parseInt(match[1], 10) : null;
};

/**
 * Extract GitHub user ID from user data object
 * @param userData - User data object with various possible field names
 * @returns GitHub user ID string or null if not found
 */
export const extractGitHubHandle = (
  userData: Record<string, unknown>
): string | null => {
  // Try different possible field names for GitHub handle
  const possibleFields = [
    'origin_s',
    'origin',
    'handle',
    'user_handle',
    'handle_s',
  ];

  for (const field of possibleFields) {
    const value = userData[field] as string;
    if (value && value.includes('github:')) {
      return value;
    }
  }

  return null;
};

/**
 * Create a fallback GitHub user object
 * @param githubId - GitHub user ID (optional)
 * @returns Default GitHubUser object
 */
export const createFallbackGitHubUser = (githubId?: number): GitHubUser => {
  const id = githubId || 0;
  return {
    login: 'User',
    name: 'Datalayer User',
    avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    id,
  };
};

/**
 * Fetch GitHub user data via IPC bridge
 * @param githubId - GitHub user ID number
 * @returns Promise resolving to GitHubUser or null
 */
export const fetchGitHubUserData = async (
  githubId: number
): Promise<GitHubUser | null> => {
  try {
    logger.debug(`Fetching GitHub user data for ID: ${githubId}`);

    const response = await window.datalayerAPI.getGitHubUser(githubId);
    if (response.success && response.data) {
      const userData = response.data as unknown as GitHubUser;
      logger.debug('GitHub user data:', userData);
      return userData;
    } else {
      console.warn('Failed to fetch GitHub user:', response.error);
      return createFallbackGitHubUser(githubId);
    }
  } catch (error) {
    console.error('Failed to fetch GitHub user:', error);
    return createFallbackGitHubUser(githubId);
  }
};

/**
 * Process user data and fetch GitHub profile
 * @param userData - Raw user data from authentication
 * @returns Promise resolving to GitHubUser or null
 */
export const processUserData = async (
  userData: Record<string, unknown>
): Promise<GitHubUser | null> => {
  logger.debug('Processing user data:', userData);

  const githubHandle = extractGitHubHandle(userData);
  if (!githubHandle) {
    logger.warn('Could not find GitHub ID in user data:', userData);
    logger.warn('Available fields:', Object.keys(userData));
    return createFallbackGitHubUser();
  }

  const githubId = extractGitHubId(githubHandle);
  if (!githubId) {
    logger.warn('Could not extract GitHub ID from handle:', githubHandle);
    return createFallbackGitHubUser();
  }

  return await fetchGitHubUserData(githubId);
};

/**
 * Filter console logs to suppress noisy Jupyter React messages
 * @returns Cleanup function to restore original console methods
 */
export const setupConsoleFiltering = (): (() => void) => {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.log = (...args: unknown[]) => {
    const message = args.join(' ');
    if (message.includes('Created config for Jupyter React') ||
        // Suppress Primer React FormControl prop warnings
        message.includes("instead of passing the 'disabled' prop directly to the input component") ||
        // Suppress misleading Jupyter React config logs (we pass serviceManager with correct URL)
        message.includes('Returning existing Jupyter React config')) {
      return; // Suppress these messages
    }
    originalConsoleLog.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');
    // Suppress various third-party library warnings
    if (message.includes('use allowUnionTypes to allow union type keyword') ||
        message.includes('strictTypes') ||
        // Suppress Lumino defaultProps deprecation warning (from JupyterLab packages)
        message.includes('Support for defaultProps will be removed from function components') ||
        // Suppress React unmount timing warning (from Jupyter components)
        message.includes('Attempted to synchronously unmount a root while React was already rendering') ||
        // Suppress cell executor warning (expected behavior when using proxy service manager)
        message.includes('Requesting cell execution without any cell executor defined') ||
        // Suppress SVG malformed warnings from JupyterLab icons
        message.includes('SVG HTML was malformed for LabIcon instance')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Don't filter console.error - we need to see actual errors
  // The beep is annoying but breaking functionality is worse
  console.error = originalConsoleError;

  return () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  };
};
