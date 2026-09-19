/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * User profile management API functions for the Datalayer platform.
 *
 * Provides functions for retrieving and managing user profile information.
 *
 * @module api/iam/profile
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import {
  MembershipsResponse,
  PrincipalSearchResponse,
  PrincipalSearchUser,
  ShareablePrincipalsResponse,
  UserMeResponse,
  WhoAmIResponse,
} from '../../models/IAM';
import { validateToken } from '../utils/validation';

/**
 * Get current authenticated user profile
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Current user profile information
 */
export const me = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<UserMeResponse> => {
  validateToken(token);

  return requestDatalayerAPI<UserMeResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/me`,
    method: 'GET',
    token,
  });
};

/**
 * Get current user identity information
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Current user identity and profile information
 */
export const whoami = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<WhoAmIResponse> => {
  validateToken(token);

  return requestDatalayerAPI<WhoAmIResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/whoami`,
    method: 'GET',
    token,
  });
};

/**
 * Get current user identity information
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 * @returns Current user identity and profile information
 */
export const memberships = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<MembershipsResponse> => {
  validateToken(token);

  return requestDatalayerAPI<MembershipsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/memberships`,
    method: 'GET',
    token,
  });
};

/**
 * Get the set of principals the authenticated user can share artifacts with
 * (self + member organizations + member teams).
 *
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 */
export const principalsShareable = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ShareablePrincipalsResponse> => {
  validateToken(token);

  return requestDatalayerAPI<ShareablePrincipalsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/principals/shareable`,
    method: 'GET',
    token,
  });
};

/**
 * Search the people, teams and organizations the caller may name: what the
 * sharing dialogs search, and whom a comment mentions or assigns (B4-02).
 *
 * @param token - Authentication token (required)
 * @param query - What is typed: part of a handle or of a name
 * @param principalTypes - What to search; people only by default
 * @param baseUrl - Base URL for the API (defaults to production IAM URL)
 */
export const searchPrincipals = async (
  token: string,
  query: string,
  principalTypes: Array<'user' | 'team' | 'organization'> = ['user'],
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<PrincipalSearchResponse> => {
  validateToken(token);

  return requestDatalayerAPI<PrincipalSearchResponse>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/principals/search`,
    method: 'POST',
    body: { query, principalTypes },
    token,
  });
};

/** A person `searchPrincipals` found, as a comment or a report names them. */
export const personOfPrincipalUser = (
  user: PrincipalSearchUser,
): { uid: string; handle: string; name: string | null } => ({
  uid: user.uid,
  handle: user.handle_s,
  name:
    `${user.first_name_t ?? ''} ${user.last_name_t ?? ''}`.trim() ||
    user.display_name_t ||
    user.display_name ||
    null,
});
