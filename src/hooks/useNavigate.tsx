/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback } from 'react';
import { useLayoutStore } from '../state';
import { createNativeNavigate } from '../navigation/adapters/native';

/**
 * Main navigation hook that provides a universal navigate function
 * Works with React Router, Next.js, or native browser navigation
 *
 * This simplified version always uses native navigation to avoid
 * React hooks ordering issues. For framework-specific navigation,
 * use the framework's own hooks directly.
 */
export const useNavigate = () => {
  const layoutStore = useLayoutStore();

  // Always use native navigation for simplicity and consistency
  const baseNavigate = createNativeNavigate();

  // Wrap with our custom behavior
  const navigate = useCallback(
    (
      location: string,
      e: any = undefined,
      resetPortals = true,
      options: any = undefined,
    ) => {
      if (e) {
        e.preventDefault();
      }
      if (resetPortals) {
        layoutStore.resetLeftPortal();
        layoutStore.resetRightPortal();
      }
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      baseNavigate(location, options);
    },
    [baseNavigate, layoutStore],
  );

  return navigate;
};

export default useNavigate;
