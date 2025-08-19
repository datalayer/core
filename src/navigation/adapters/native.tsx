/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Global event emitter for navigation changes
const navigationListeners = new Set<() => void>();

const notifyNavigationChange = () => {
  navigationListeners.forEach(listener => listener());
};

/**
 * Create native browser navigation function
 */
export const createNativeNavigate = () => {
  return (to: string, options?: any) => {
    if (typeof window === 'undefined') return;

    // Parse the URL
    const url = new URL(to, window.location.href);

    // Use options if provided, otherwise default to empty object
    const navOptions = options || {};
    const state = navOptions.state || null;

    if (navOptions.replace) {
      window.history.replaceState(state, '', url.href);
      // Dispatch custom event for location hooks
      window.dispatchEvent(new Event('replacestate'));
    } else {
      window.history.pushState(state, '', url.href);
      // Dispatch custom event for location hooks
      window.dispatchEvent(new Event('pushstate'));
    }

    // Notify all listeners of the navigation
    notifyNavigationChange();

    // Handle scrolling
    if (navOptions.scroll !== false) {
      window.scrollTo(0, 0);
    }
  };
};

/**
 * Simple native adapter for backward compatibility
 */
export const createNativeAdapter = () => {
  return {
    name: 'native',
    isAvailable: () =>
      typeof window !== 'undefined' && !!window.history && !!window.location,
  };
};
