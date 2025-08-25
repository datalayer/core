/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParamsRR } from '../navigation/adapters/react-router';
import {
  useParamsNext,
  useSearchParamsNext,
} from '../navigation/adapters/nextjs';

/**
 * Hook to get URL parameters
 * Works with Next.js App Router, React Router, or falls back to URL parsing
 */
export const useParams = (): Record<string, string> => {
  // State for fallback URL search params
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});

  // Detect environment
  const isNextJs =
    typeof window !== 'undefined' && !!(window as any).__NEXT_DATA__;
  const isClient = typeof window !== 'undefined';

  // Try to get params from different sources
  let routeParams: Record<string, string | string[] | undefined> = {};
  const queryParams: Record<string, string> = {};
  let paramsSource: 'nextjs' | 'react-router' | 'fallback' = 'fallback';

  // 1. Try Next.js first (if detected)

  if (isNextJs && useParamsNext) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      routeParams = useParamsNext() || {};
      paramsSource = 'nextjs';

      // Also get search params in Next.js

      if (useSearchParamsNext) {
        try {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const searchParamsObj = useSearchParamsNext();
          if (searchParamsObj) {
            searchParamsObj.forEach((value: string, key: string) => {
              queryParams[key] = value;
            });
          }
        } catch {
          // Not in Next.js context or search params not available
        }
      }
    } catch {
      // Not in Next.js router context
    }
  }

  // 2. Try React Router (if not Next.js)

  if (paramsSource === 'fallback' && !isNextJs && useParamsRR) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      routeParams = useParamsRR() || {};
      paramsSource = 'react-router';
    } catch {
      // Not in React Router context
    }
  }

  // 3. Get URL search params (for React Router and fallback)
  useEffect(() => {
    if (!isClient || paramsSource === 'nextjs') return;

    const updateSearchParams = () => {
      const params: Record<string, string> = {};
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.forEach((value, key) => {
        params[key] = value;
      });
      setSearchParams(params);
    };

    updateSearchParams();

    // Listen for URL changes
    window.addEventListener('popstate', updateSearchParams);
    window.addEventListener('pushstate', updateSearchParams as any);
    window.addEventListener('replacestate', updateSearchParams as any);

    return () => {
      window.removeEventListener('popstate', updateSearchParams);
      window.removeEventListener('pushstate', updateSearchParams as any);
      window.removeEventListener('replacestate', updateSearchParams as any);
    };
  }, [isClient, paramsSource]);

  // 4. For fallback, also try to parse route params from URL path
  const fallbackRouteParams = useMemo(() => {
    if (!isClient || paramsSource !== 'fallback') return {};

    const pathname = window.location.pathname;
    const params: Record<string, string> = {};

    // Common patterns to match
    // /products/123 -> { id: '123' }
    // /users/john-doe -> { username: 'john-doe' }
    // /blog/2024/01/my-post -> { year: '2024', month: '01', slug: 'my-post' }

    const patterns = [
      { regex: /^\/products\/([^/]+)$/, params: ['id'] },
      { regex: /^\/products\/([^/]+)\/reviews$/, params: ['id'] },
      { regex: /^\/users\/([^/]+)$/, params: ['username'] },
      {
        regex: /^\/blog\/(\d{4})\/(\d{2})\/([^/]+)$/,
        params: ['year', 'month', 'slug'],
      },
      { regex: /^\/posts\/([^/]+)$/, params: ['slug'] },
      { regex: /^\/([^/]+)\/([^/]+)$/, params: ['category', 'id'] },
    ];

    for (const pattern of patterns) {
      const match = pathname.match(pattern.regex);
      if (match) {
        pattern.params.forEach((paramName, index) => {
          if (match[index + 1]) {
            params[paramName] = match[index + 1];
          }
        });
        break;
      }
    }

    return params;
  }, [isClient, paramsSource, isClient ? window.location.pathname : '']);

  // Combine all params with proper memoization to prevent re-renders
  const combinedParams = useMemo(() => {
    const result: Record<string, string> = {};

    // Add route params
    for (const [key, value] of Object.entries(routeParams)) {
      if (value !== undefined) {
        // Handle array values (Next.js catch-all routes)
        result[key] = Array.isArray(value) ? value.join('/') : String(value);
      }
    }

    // Add query params (Next.js)
    for (const [key, value] of Object.entries(queryParams)) {
      result[key] = value;
    }

    // Add search params (React Router and fallback)
    if (paramsSource !== 'nextjs') {
      for (const [key, value] of Object.entries(searchParams)) {
        result[key] = value;
      }
    }

    // Add fallback route params
    if (paramsSource === 'fallback') {
      for (const [key, value] of Object.entries(fallbackRouteParams)) {
        result[key] = value;
      }
    }

    return result;
  }, [
    // Use JSON.stringify for deep comparison
    JSON.stringify(routeParams),
    JSON.stringify(queryParams),
    JSON.stringify(searchParams),
    JSON.stringify(fallbackRouteParams),
    paramsSource,
  ]);

  return combinedParams;
};
