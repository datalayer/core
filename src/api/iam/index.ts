/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * IAM (Identity and Access Management) API exports.
 *
 * Provides organized access to authentication, OAuth2, and user profile functionality.
 *
 * @module api/iam
 */

export * as authentication from './authentication';
export * as oauth2 from './oauth2';
export * as profile from './profile';
export * as healthz from './healthz';
export * as usage from './usage';

// For backward compatibility, export the old API structure
export { login, logout, checkAuth } from './authentication';
export {
  getOAuth2AuthzUrl,
  getOAuth2AuthzUrlForLink,
  handleGitHubOAuth2Callback,
  handleLinkedInOAuth2Callback,
  handleOktaOAuth2Callback,
  type OAuth2Provider,
  type OAuth2AuthzUrlResponse,
  type OAuth2CallbackParams,
  type OAuth2CallbackResponse,
} from './oauth2';
export { me, whoami } from './profile';
export { ping } from './healthz';
export { getCredits } from './usage';
