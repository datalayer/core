/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module EnvironmentStore
 * @description Zustand store for managing environment data with caching, selection state, and API integration
 */

import { create } from 'zustand';
import { apiLogger } from '../utils/logger';

/**
 * Environment configuration interface
 * @interface
 */
interface Environment {
  name: string;
  language?: string;
  title?: string;
  description?: string;
  dockerImage?: string;
  condaEnvironment?: string;
  pipRequirements?: string;
  tags?: string[];
  isDefault?: boolean;
  image?: string;
  resources?: {
    cpu?: { min?: number; max?: number; default?: number };
    memory?: { min?: number; max?: number; default?: number };
    gpu?: { min?: number; max?: number; default?: number };
  };
}

/**
 * State interface for the environment store
 * @interface
 */
interface EnvironmentState {
  // Cache data
  environments: Environment[];
  lastFetchTime: number | null;
  cacheExpiryMs: number; // Default 5 minutes

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedEnvironment: string | null;

  // Actions
  setEnvironments: (environments: Environment[]) => void;
  setSelectedEnvironment: (name: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Cache management
  isCacheValid: () => boolean;
  invalidateCache: () => void;
  setCacheExpiry: (ms: number) => void;

  // Fetch with cache
  fetchEnvironmentsIfNeeded: () => Promise<Environment[]>;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  // Initial state
  environments: [],
  lastFetchTime: null,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes default
  isLoading: false,
  error: null,
  selectedEnvironment: null,

  // Basic setters
  setEnvironments: environments => {
    set({
      environments,
      lastFetchTime: Date.now(),
      error: null,
    });
  },

  setSelectedEnvironment: name => set({ selectedEnvironment: name }),
  setLoading: loading => set({ isLoading: loading }),
  setError: error => set({ error }),

  // Cache validation
  isCacheValid: () => {
    const { lastFetchTime, cacheExpiryMs } = get();
    if (!lastFetchTime) return false;

    const now = Date.now();
    const age = now - lastFetchTime;
    return age < cacheExpiryMs;
  },

  invalidateCache: () => {
    set({ lastFetchTime: null });
  },

  setCacheExpiry: ms => {
    set({ cacheExpiryMs: ms });
  },

  // Smart fetch with caching
  fetchEnvironmentsIfNeeded: async () => {
    const state = get();

    // Return cached data if valid
    if (state.isCacheValid() && state.environments.length > 0) {
      apiLogger.debug('Using cached environments data');
      return state.environments;
    }

    // Already loading, return existing data
    if (state.isLoading) {
      return state.environments;
    }

    // Fetch new data
    set({ isLoading: true, error: null });

    try {
      apiLogger.debug('Fetching fresh environments data...');

      // Fetch from API
      const response = await window.datalayerAPI.getEnvironments();

      if (response.success && response.data) {
        const environments = response.data;

        // Update store with fresh data
        set({
          environments,
          lastFetchTime: Date.now(),
          isLoading: false,
          error: null,
        });

        return environments;
      } else {
        const errorMsg = response.error || 'Failed to fetch environments';
        set({
          error: errorMsg,
          isLoading: false,
        });
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to fetch environments';
      apiLogger.error('Error fetching environments:', error);

      set({
        error: errorMsg,
        isLoading: false,
      });

      // Return cached data even if expired, as fallback
      return state.environments;
    }
  },
}));

// Helper hook for common operations
export const useEnvironments = () => {
  const store = useEnvironmentStore();

  return {
    environments: store.environments,
    isLoading: store.isLoading,
    error: store.error,
    selectedEnvironment: store.selectedEnvironment,
    selectEnvironment: store.setSelectedEnvironment,
    fetchIfNeeded: store.fetchEnvironmentsIfNeeded,
    refresh: () => {
      store.invalidateCache();
      return store.fetchEnvironmentsIfNeeded();
    },
  };
};
