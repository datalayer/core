/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Cache for the Next.js modules
let nextNavigationModule: any = null;
let nextRouterModule: any = null;
let isNextAppRouterAvailable: boolean | null = null;
let isNextPagesRouterAvailable: boolean | null = null;

/**
 * Check if Next.js App Router is available
 */
export const checkNextAppRouterAvailability = async (): Promise<boolean> => {
  if (isNextAppRouterAvailable !== null) {
    return isNextAppRouterAvailable;
  }

  try {
    nextNavigationModule = await import('next/navigation');
    isNextAppRouterAvailable = true;
    return true;
  } catch {
    isNextAppRouterAvailable = false;
    return false;
  }
};

/**
 * Check if Next.js Pages Router is available
 */
export const checkNextPagesRouterAvailability = async (): Promise<boolean> => {
  if (isNextPagesRouterAvailable !== null) {
    return isNextPagesRouterAvailable;
  }

  try {
    nextRouterModule = await import('next/router');
    isNextPagesRouterAvailable = true;
    return true;
  } catch {
    isNextPagesRouterAvailable = false;
    return false;
  }
};

/**
 * Check if we're in a Next.js environment
 */
export const isNextJsEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__NEXT_DATA__;
};

/**
 * Get Next.js App Router hooks if available
 */
export const getNextAppRouterHooks = () => {
  if (!nextNavigationModule || !isNextAppRouterAvailable) {
    return null;
  }

  const { usePathname, useSearchParams, useRouter } = nextNavigationModule;

  return {
    usePathname,
    useSearchParams,
    useRouter,
  };
};

/**
 * Get Next.js Pages Router hooks if available
 */
export const getNextPagesRouterHooks = () => {
  if (!nextRouterModule || !isNextPagesRouterAvailable) {
    return null;
  }

  const { useRouter } = nextRouterModule;

  return {
    useRouter,
  };
};

/**
 * Create a navigation function using Next.js App Router
 */
export const createNextAppRouterNavigate = () => {
  if (!nextNavigationModule || !isNextAppRouterAvailable) {
    return null;
  }

  const { useRouter } = nextNavigationModule;
  return () => {
    const router = useRouter();
    return (to: string, options?: any) => {
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    };
  };
};

/**
 * Create a navigation function using Next.js Pages Router
 */
export const createNextPagesRouterNavigate = () => {
  if (!nextRouterModule || !isNextPagesRouterAvailable) {
    return null;
  }

  const { useRouter } = nextRouterModule;
  return () => {
    const router = useRouter();
    return (to: string, options?: any) => {
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    };
  };
};
