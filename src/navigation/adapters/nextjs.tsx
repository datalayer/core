/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Try to import Next.js modules if available
let nextNavigationModule: any = null;
let nextRouterModule: any = null;

// Only try to load Next.js modules if we're in a Next.js environment
if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
  try {
    nextNavigationModule = require('next/navigation');
  } catch {
    // Next.js App Router not available
  }

  try {
    nextRouterModule = require('next/router');
  } catch {
    // Next.js Pages Router not available
  }
}

/**
 * Check if we're in a Next.js environment
 */
export const isNextJsEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__NEXT_DATA__;
};

// Export App Router hooks directly for synchronous access
export const useParamsNext = nextNavigationModule?.useParams || undefined;
export const useSearchParamsNext =
  nextNavigationModule?.useSearchParams || undefined;
export const useRouterNext = nextNavigationModule?.useRouter || undefined;
export const usePathnameNext = nextNavigationModule?.usePathname || undefined;

// Export Pages Router hooks (for potential future use)
export const useRouterNextPages = nextRouterModule?.useRouter || undefined;
