/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Export React Router hook exports for direct use
export {
  useParamsRR,
  useLocationRR,
  useNavigateRR,
} from './adapters/react-router';

// Export Next.js hook exports for direct use
export {
  useParamsNext,
  useSearchParamsNext,
  useRouterNext,
  usePathnameNext,
  useRouterNextPages,
  isNextJsEnvironment,
} from './adapters/nextjs';

// Native adapter utilities
export { createNativeAdapter, createNativeNavigate } from './adapters/native';

// Export components if they exist
export { NavigationLink, Link, NavLink } from './components';
