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

/**
 * Hook to get current location
 * This simplified version always uses native browser location
 * to avoid React hooks ordering issues.
 */
export const useLocation = (): Location => {
  const [location, setLocation] = useState<Location>(() => {
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

  useEffect(() => {
    // Listen to popstate for browser navigation changes
    const handleLocationChange = () => {
      setLocation({
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
  }, []);

  return location;
};

/**
 * Hook to get URL parameters
 */
export const useParams = (): Record<string, string> => {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    // Parse search params from URL
    const updateParams = () => {
      const urlParams: Record<string, string> = {};
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });
      setParams(urlParams);
    };

    updateParams();
    window.addEventListener('popstate', updateParams);
    window.addEventListener('pushstate', updateParams as any);
    window.addEventListener('replacestate', updateParams as any);

    return () => {
      window.removeEventListener('popstate', updateParams);
      window.removeEventListener('pushstate', updateParams as any);
      window.removeEventListener('replacestate', updateParams as any);
    };
  }, []);

  return params;
};

/**
 * Hook to get history functions
 */
export const useHistory = () => {
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
