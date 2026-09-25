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
// Typed here rather than inferred: the inferred type carries React Router's
// own doc comment, whose links (`redirect`, `To`, `<ScrollRestoration>`) point
// at symbols these docs do not include, and typedoc fails the build on them.
export const useNavigateRR: () => ReactRouterDom.NavigateFunction =
  ReactRouterDom.useNavigate;
