/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module usePreload
 * @description React hooks for managing component preloading operations with parallel coordination support
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * State interface for preloading operations
 * @interface
 */
export interface PreloadState {
  isPreloading: boolean;
  isPreloaded: boolean;
  error: Error | null;
}

/**
 * Configuration options for the usePreload hook
 * @interface
 */
export interface UsePreloadOptions {
  autoStart?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Return type for the usePreload hook
 * @interface
 */
export interface UsePreloadResult extends PreloadState {
  startPreload: () => Promise<void>;
  reset: () => void;
}

/**
 * React hook that manages component preloading states for parallel loading optimization.
 * Supports automatic start, success/error callbacks, and prevents duplicate operations.
 *
 * @param preloadFn - Async function to execute for preloading
 * @param options - Configuration options for preload behavior
 * @returns Object containing preload state and control functions
 */
export function usePreload(
  preloadFn: () => Promise<void>,
  options: UsePreloadOptions = {}
): UsePreloadResult {
  const { autoStart = false, onSuccess, onError } = options;

  const [state, setState] = useState<PreloadState>({
    isPreloading: false,
    isPreloaded: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const preloadPromiseRef = useRef<Promise<void> | null>(null);

  /**
   * Starts the preload operation if not already running or completed
   * @returns Promise that resolves when preloading is complete
   */
  const startPreload = useCallback(async () => {
    // Avoid duplicate preloading
    if (state.isPreloaded || state.isPreloading) {
      return preloadPromiseRef.current || Promise.resolve();
    }

    setState({
      isPreloading: true,
      isPreloaded: false,
      error: null,
    });

    const promise = (async () => {
      try {
        await preloadFn();

        if (isMountedRef.current) {
          setState({
            isPreloading: false,
            isPreloaded: true,
            error: null,
          });
          onSuccess?.();
        }
      } catch (error) {
        if (isMountedRef.current) {
          const err = error instanceof Error ? error : new Error(String(error));
          setState({
            isPreloading: false,
            isPreloaded: false,
            error: err,
          });
          onError?.(err);
        }
      }
    })();

    preloadPromiseRef.current = promise;
    return promise;
  }, [preloadFn, onSuccess, onError, state.isPreloaded, state.isPreloading]);

  /**
   * Resets the preload state to initial values
   */
  const reset = useCallback(() => {
    setState({
      isPreloading: false,
      isPreloaded: false,
      error: null,
    });
    preloadPromiseRef.current = null;
  }, []);

  useEffect(() => {
    if (autoStart) {
      startPreload();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoStart, startPreload]);

  return {
    ...state,
    startPreload,
    reset,
  };
}

/**
 * React hook that coordinates multiple preload operations in parallel.
 * Useful for managing complex loading scenarios with multiple dependencies.
 *
 * @param preloadConfigs - Array of preload configurations with names and functions
 * @returns Object containing individual preload states and coordination functions
 */
export function useParallelPreload(
  preloadConfigs: Array<{
    name: string;
    preloadFn: () => Promise<void>;
  }>
) {
  const [preloadStates, setPreloadStates] = useState<
    Record<string, PreloadState>
  >(() => {
    const initialStates: Record<string, PreloadState> = {};
    preloadConfigs.forEach(config => {
      initialStates[config.name] = {
        isPreloading: false,
        isPreloaded: false,
        error: null,
      };
    });
    return initialStates;
  });

  /**
   * Starts all configured preload operations in parallel
   * @returns Promise that resolves when all preloads have completed (success or failure)
   */
  const startAllPreloads = useCallback(async () => {
    // Start all preloads in parallel
    const promises = preloadConfigs.map(async config => {
      setPreloadStates(prev => ({
        ...prev,
        [config.name]: {
          isPreloading: true,
          isPreloaded: false,
          error: null,
        },
      }));

      try {
        await config.preloadFn();
        setPreloadStates(prev => ({
          ...prev,
          [config.name]: {
            isPreloading: false,
            isPreloaded: true,
            error: null,
          },
        }));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setPreloadStates(prev => ({
          ...prev,
          [config.name]: {
            isPreloading: false,
            isPreloaded: false,
            error: err,
          },
        }));
      }
    });

    await Promise.allSettled(promises);
  }, [preloadConfigs]);

  const isAllPreloaded = Object.values(preloadStates).every(
    state => state.isPreloaded
  );
  const isAnyPreloading = Object.values(preloadStates).some(
    state => state.isPreloading
  );
  const hasAnyError = Object.values(preloadStates).some(
    state => state.error !== null
  );

  return {
    preloadStates,
    startAllPreloads,
    isAllPreloaded,
    isAnyPreloading,
    hasAnyError,
  };
}
