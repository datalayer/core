/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { DEFAULT_SERVICE_URLS } from '../constants';

/**
 * Load test environment configuration
 * Loads from .env.test file and falls back to environment variables
 */
const loadTestConfig = () => {
  // Load .env.test file from project root
  const testEnvPath = path.resolve(process.cwd(), '.env.test');
  dotenv.config({ path: testEnvPath });

  // Also load regular .env as fallback
  dotenv.config();
};

// Load config immediately when module is imported
loadTestConfig();

/**
 * Test configuration object with proper fallbacks
 */
export const testConfig = {
  /**
   * Get the Datalayer API token for testing
   * Priority order:
   * 1. DATALAYER_TEST_TOKEN environment variable
   * 2. DATALAYER_API_TOKEN environment variable
   * 3. Throw error if not found
   */
  getToken(): string {
    const token =
      process.env.DATALAYER_TEST_TOKEN || process.env.DATALAYER_API_TOKEN;

    if (!token) {
      throw new Error(
        'No Datalayer API token found. Please set DATALAYER_TEST_TOKEN or DATALAYER_API_TOKEN environment variable',
      );
    }

    return token;
  },

  /**
   * Get the base URL for testing
   * Uses DEFAULT_SERVICE_URLS or can be overridden via environment
   */
  getBaseUrl(service: 'IAM' | 'RUNTIMES' | 'SPACER' = 'IAM'): string {
    const envBaseUrl = process.env.DATALAYER_TEST_BASE_URL;
    if (envBaseUrl) {
      return envBaseUrl;
    }
    return DEFAULT_SERVICE_URLS[service];
  },

  /**
   * Check if expensive tests should be skipped
   */
  shouldSkipExpensive(): boolean {
    return process.env.DATALAYER_TEST_SKIP_EXPENSIVE === 'true';
  },

  /**
   * Check if expensive tests should be run
   */
  shouldRunExpensive(): boolean {
    return process.env.DATALAYER_TEST_RUN_EXPENSIVE === 'true';
  },

  /**
   * Get test environment names for runtime creation
   */
  getTestEnvironments(): { python: string; ai: string } {
    return {
      python: process.env.DATALAYER_TEST_PYTHON_ENV || 'python-cpu-env',
      ai: process.env.DATALAYER_TEST_AI_ENV || 'ai-env',
    };
  },

  /**
   * Check if debug output is enabled
   */
  isDebugEnabled(): boolean {
    return process.env.DATALAYER_TEST_DEBUG === 'true';
  },

  /**
   * Get custom timeout for API calls (in milliseconds)
   */
  getTimeout(): number {
    const timeout = process.env.DATALAYER_TEST_TIMEOUT;
    return timeout ? parseInt(timeout, 10) : 60000; // Default 60 seconds
  },
};

/**
 * Helper function to skip tests if no token is available
 */
export const skipIfNoToken = () => {
  try {
    testConfig.getToken();
    return false;
  } catch {
    return true;
  }
};

/**
 * Log debug information if debug is enabled
 */
export const debugLog = (...args: any[]) => {
  if (testConfig.isDebugEnabled()) {
    console.log('[DEBUG]', ...args);
  }
};
