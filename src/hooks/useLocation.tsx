/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';

export interface Location {
  pathname: string;
  search: string;
  hash: string;
  state: any;
  key: string;
}

// Import React Router hooks from our wrapper
import {
  useLocationRR,
  useNavigateRR,
} from '../navigation/adapters/react-router';
// Import Next.js hooks from our wrapper
// Currently not used but kept for future Next.js support
// import {
//   usePathnameNext,
//   useSearchParamsNext,
// } from '../navigation/adapters/nextjs';

/**
 * Hook to get current location
 * Detects and uses React Router when available, falls back to native browser location
 */
export const useLocation = (): Location => {
  // Native location state for fallback
  const [nativeLocation, setNativeLocation] = useState<Location>(() => {
    if (typeof window === 'undefined') {
      return {
        pathname: '/',
        search: '',
        hash: '',
        state: null,
        key: 'default',
      };
    }
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
      key: 'default',
    };
  });

  // Detect environment
  const isNextJs =
    typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;
  const isClient = typeof window !== 'undefined';

  // Try to use React Router if available
  let routerLocation: Location | null = null;
  let isReactRouter = false;

  try {
    // Only actually use the hook if we have it and not in Next.js

    if (!isNextJs && useLocationRR && isClient) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      routerLocation = useLocationRR();
      isReactRouter = !!routerLocation;
    }
  } catch {
    // Not in a Router context, fallback to native
  }

  useEffect(() => {
    // Only set up native listeners if not using React Router
    if (isReactRouter) return;

    // Listen to popstate for browser navigation changes
    const handleLocationChange = () => {
      setNativeLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        state: window.history.state,
        key: 'native-' + Date.now(),
      });
    };

    window.addEventListener('popstate', handleLocationChange);

    // Also listen for custom navigation events if needed
    window.addEventListener('pushstate', handleLocationChange as any);
    window.addEventListener('replacestate', handleLocationChange as any);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange as any);
      window.removeEventListener('replacestate', handleLocationChange as any);
    };
  }, [isReactRouter]);

  // Return React Router location if available, otherwise native location
  return isReactRouter && routerLocation ? routerLocation : nativeLocation;
};

/**
 * Hook to get history functions
 * Detects and uses React Router history when available, falls back to browser history
 */
export const useHistory = () => {
  // Detect environment
  const isNextJs =
    typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;
  const isClient = typeof window !== 'undefined';

  // Try to use React Router if available
  let routerNavigate: any = null;
  let isReactRouter = false;

  try {
    if (!isNextJs && useNavigateRR && isClient) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      routerNavigate = useNavigateRR();
      isReactRouter = true;
    }
  } catch {
    // Not in a Router context
  }

  if (isReactRouter && routerNavigate) {
    // Use React Router navigation
    return {
      back: () => {
        routerNavigate(-1);
      },
      forward: () => {
        routerNavigate(1);
      },
      replace: (to: string, state?: any) => {
        routerNavigate(to, { replace: true, state });
      },
      push: (to: string, state?: any) => {
        routerNavigate(to, { state });
      },
    };
  }

  // Fall back to native browser history
  return {
    back: () => {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    },
    forward: () => {
      if (typeof window !== 'undefined') {
        window.history.forward();
      }
    },
    replace: (to: string, state?: any) => {
      if (typeof window !== 'undefined') {
        const url = new URL(to, window.location.href);
        window.history.replaceState(state || null, '', url.href);
        // Dispatch custom event for location hooks
        window.dispatchEvent(new Event('replacestate'));
      }
    },
    push: (to: string, state?: any) => {
      if (typeof window !== 'undefined') {
        const url = new URL(to, window.location.href);
        window.history.pushState(state || null, '', url.href);
        // Dispatch custom event for location hooks
        window.dispatchEvent(new Event('pushstate'));
      }
    },
  };
};
