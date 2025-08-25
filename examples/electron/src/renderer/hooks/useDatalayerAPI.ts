/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useCallback, useEffect } from 'react';
import { useCoreStore } from '@datalayer/core';
import type { IDatalayerEnvironment } from '@datalayer/core';

/**
 * Hook for accessing Datalayer API through secure IPC
 * All API calls go through the main process for security
 */
export function useDatalayerAPI() {
  const { setConfiguration } = useCoreStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if we're in Electron environment
   */
  const isElectron = () => {
    return window.datalayerAPI !== undefined;
  };

  /**
   * Login with credentials
   */
  const login = useCallback(
    async (runUrl: string, token: string) => {
      if (!isElectron()) {
        setError('Not in Electron environment');
        return { success: false, message: 'Not in Electron environment' };
      }

      setLoading(true);
      setError(null);

      try {
        const result = await window.datalayerAPI.login({ runUrl, token });

        if (result.success) {
          // Update the store with credentials (without token for security)
          setConfiguration({
            runUrl,
            token: 'secured', // Don't store actual token in renderer
            cpuEnvironment: 'python-cpu-env',
            gpuEnvironment: 'ai-env',
            credits: 100,
          });
        } else {
          setError(result.message || 'Login failed');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [setConfiguration]
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    if (!isElectron()) {
      return { success: false };
    }

    try {
      const result = await window.datalayerAPI.logout();

      if (result.success) {
        // Clear the store
        setConfiguration({});
      }

      return result;
    } catch (err) {
      console.error('Logout error:', err);
      return { success: false };
    }
  }, [setConfiguration]);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    if (!isElectron()) {
      return { isAuthenticated: false };
    }

    try {
      const credentials = await window.datalayerAPI.getCredentials();

      if (credentials.isAuthenticated) {
        // Update store with current state
        setConfiguration({
          runUrl: credentials.runUrl,
          token: 'secured',
          cpuEnvironment: 'python-cpu-env',
          gpuEnvironment: 'ai-env',
          credits: 100,
        });
      }

      return credentials;
    } catch (err) {
      console.error('Auth check error:', err);
      return { isAuthenticated: false };
    }
  }, [setConfiguration]);

  /**
   * Fetch environments
   */
  const getEnvironments = useCallback(async (): Promise<
    IDatalayerEnvironment[]
  > => {
    if (!isElectron()) {
      setError('Not in Electron environment');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.datalayerAPI.getEnvironments();

      if (result.success) {
        return result.data || [];
      } else {
        setError(result.error || 'Failed to fetch environments');
        return [];
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch environments';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a runtime
   */
  const createRuntime = useCallback(
    async (options: {
      environment: string;
      name?: string;
      credits?: number;
    }) => {
      if (!isElectron()) {
        setError('Not in Electron environment');
        return { success: false, error: 'Not in Electron environment' };
      }

      setLoading(true);
      setError(null);

      try {
        const result = await window.datalayerAPI.createRuntime(options);

        if (!result.success) {
          setError(result.error || 'Failed to create runtime');
        }

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create runtime';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Make a generic API request
   */
  const request = useCallback(
    async (
      endpoint: string,
      options?: {
        method?: string;
        body?: any;
        headers?: Record<string, string>;
      }
    ) => {
      if (!isElectron()) {
        setError('Not in Electron environment');
        return { success: false, error: 'Not in Electron environment' };
      }

      setLoading(true);
      setError(null);

      try {
        const result = await window.datalayerAPI.request(endpoint, options);

        if (!result.success) {
          setError(result.error || 'Request failed');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Request failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    // State
    loading,
    error,
    isElectron: isElectron(),

    // Methods
    login,
    logout,
    checkAuth,
    getEnvironments,
    createRuntime,
    request,
  };
}
