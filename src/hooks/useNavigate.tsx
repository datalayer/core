/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback } from 'react';
import { useLayoutStore } from '../state';
import { createNativeNavigate } from '../navigation/adapters/native';
// Import React Router hooks from our wrapper
import { useNavigateRR } from '../navigation/adapters/react-router';
// Import Next.js hooks from our wrapper
// Currently not used but kept for future Next.js support
// import { useRouterNext } from '../navigation/adapters/nextjs';

/**
 * Main navigation hook that provides a universal navigate function
 * Works with React Router, Next.js, or native browser navigation
 */
export const useNavigate = () => {
  const layoutStore = useLayoutStore();

  // Detect environment
  const isNextJs =
    typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;
  const isClient = typeof window !== 'undefined';

  // Try to use React Router's useNavigate if available
  let rrNavigate: any = null;
  let isReactRouter = false;

  if (!isNextJs && useNavigateRR && isClient) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      rrNavigate = useNavigateRR();
      isReactRouter = !!rrNavigate;
    } catch {
      // Not in a Router context
    }
  }

  // If React Router is available, return it directly (wrapped for consistency)

  if (isReactRouter && rrNavigate) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCallback(
      (to: string, options?: any) => {
        // For React Router, just pass through directly without side effects
        return rrNavigate(to, options);
      },
      [rrNavigate],
    );
  }

  // Otherwise use native navigation with our custom behavior
  const baseNavigate = createNativeNavigate();

  // Wrap with our custom behavior for native navigation
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = useCallback(
    (
      location: string,
      optionsOrEvent?: any,
      resetPortals = true,
      extraOptions?: any,
    ) => {
      // Handle different call signatures for native navigation
      let options: any = undefined;
      let event: any = undefined;

      if (optionsOrEvent && optionsOrEvent.preventDefault) {
        // Legacy signature with event as second parameter
        event = optionsOrEvent;
        options = extraOptions;
      } else if (typeof optionsOrEvent === 'boolean') {
        // Legacy signature with resetPortals as second parameter
        resetPortals = optionsOrEvent;
        options = extraOptions;
      } else {
        // Standard signature with options as second parameter
        options = optionsOrEvent;
      }

      if (event) {
        event.preventDefault();
      }

      if (resetPortals) {
        layoutStore.resetLeftPortal();
        layoutStore.resetRightPortal();
      }
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;

      // Use native navigation
      baseNavigate(location, options);
    },
    [baseNavigate, layoutStore],
  );

  return navigate;
};

export default useNavigate;
