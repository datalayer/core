/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Cache for the react-router-dom module
let reactRouterDomModule: any = null;
let isReactRouterAvailable: boolean | null = null;

/**
 * Check if react-router-dom is available
 */
export const checkReactRouterAvailability = async (): Promise<boolean> => {
  if (isReactRouterAvailable !== null) {
    return isReactRouterAvailable;
  }

  // Don't even try to load React Router in Next.js environment
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
    isReactRouterAvailable = false;
    return false;
  }

  try {
    reactRouterDomModule = await import('react-router-dom');
    isReactRouterAvailable = true;
    return true;
  } catch {
    isReactRouterAvailable = false;
    return false;
  }
};

/**
 * Get React Router hooks if available
 */
export const getReactRouterHooks = () => {
  if (!reactRouterDomModule || !isReactRouterAvailable) {
    return null;
  }

  const { useLocation, useNavigate, useParams } = reactRouterDomModule;

  return {
    useLocation,
    useNavigate,
    useParams,
  };
};

/**
 * Get React Router's navigate function if in context
 */
export const getReactRouterNavigate = () => {
  if (!reactRouterDomModule || !isReactRouterAvailable) {
    return null;
  }

  try {
    const { useNavigate } = reactRouterDomModule;
    return useNavigate;
  } catch {
    return null;
  }
};
