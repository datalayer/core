/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Import React Router hooks directly
// If react-router-dom is not installed, the build will fail
// which is expected behavior
import * as ReactRouterDom from 'react-router-dom';

// Export hooks with clean names (path already indicates React Router)
export const useParams = ReactRouterDom.useParams;
export const useLocation = ReactRouterDom.useLocation;
export const useNavigate = ReactRouterDom.useNavigate;
export const useSearchParams = ReactRouterDom.useSearchParams;
