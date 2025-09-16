/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Import React Router hooks directly
// If react-router-dom is not installed, the build will fail
// which is expected behavior
import * as ReactRouterDom from 'react-router-dom';

// Export hooks for use in our navigation hooks
export const useParamsRR = ReactRouterDom.useParams;
export const useLocationRR = ReactRouterDom.useLocation;
export const useNavigateRR = ReactRouterDom.useNavigate;
