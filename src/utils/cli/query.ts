/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient instance for TanStack Query
 * Used across the application for consistent cache management
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: false, // Don't refetch on mount if data is still fresh
      refetchOnWindowFocus: false,
      retry: 1,
      // Ensure queries prioritize cache over network when data is fresh
      networkMode: 'online' as const,
    },
  },
});
