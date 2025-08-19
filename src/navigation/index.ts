/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Export adapter utilities (for advanced usage)
export {
  checkReactRouterAvailability,
  getReactRouterHooks,
  getReactRouterNavigate,
} from './adapters/react-router';

export {
  isNextJsEnvironment,
  checkNextAppRouterAvailability,
  checkNextPagesRouterAvailability,
  getNextAppRouterHooks,
  getNextPagesRouterHooks,
  createNextAppRouterNavigate,
  createNextPagesRouterNavigate,
} from './adapters/nextjs';

// Native adapter utilities
export { createNativeAdapter, createNativeNavigate } from './adapters/native';

// Export components if they exist
export { NavigationLink, Link, NavLink } from './components';
