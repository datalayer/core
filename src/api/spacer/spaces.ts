/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/spaces
 * @description Workspace spaces API functions for the Datalayer platform.
 *
 * Provides functions for managing workspace spaces (organizing content).
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import {
  Space,
  CreateSpaceRequest,
  SpacesListParams,
  SpacesListResponse,
} from '../types/spacer';

/**
 * Create a new workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Space creation configuration
 * @returns Promise resolving to the created space
 */
export const create = async (
  baseUrl: string,
  token: string,
  data: CreateSpaceRequest,
): Promise<Space> => {
  return requestDatalayerAPI<Space>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * List all accessible workspace spaces.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param params - Optional filtering and pagination parameters
 * @returns Promise resolving to list of spaces
 */
export const list = async (
  baseUrl: string,
  token: string,
  params?: SpacesListParams,
): Promise<SpacesListResponse> => {
  return requestDatalayerAPI<SpacesListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space
 * @returns Promise resolving to space details
 */
export const get = async (
  baseUrl: string,
  token: string,
  spaceId: string,
): Promise<Space> => {
  return requestDatalayerAPI<Space>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}`,
    method: 'GET',
    token,
  });
};

/**
 * Update an existing workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space
 * @param data - Partial space data to update
 * @returns Promise resolving to updated space details
 */
export const update = async (
  baseUrl: string,
  token: string,
  spaceId: string,
  data: Partial<CreateSpaceRequest>,
): Promise<Space> => {
  return requestDatalayerAPI<Space>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}`,
    method: 'PATCH',
    token,
    body: data,
  });
};

/**
 * Delete a workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space to delete
 * @returns Promise resolving when deletion is complete
 */
export const remove = async (
  baseUrl: string,
  token: string,
  spaceId: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Export a workspace space as a ZIP archive.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space
 * @returns Promise resolving to ZIP archive binary data
 */
export const exportSpace = async (
  baseUrl: string,
  token: string,
  spaceId: string,
): Promise<Blob> => {
  return requestDatalayerAPI<Blob>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}/export`,
    method: 'GET',
    token,
  });
};

/**
 * Add a member to a workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space
 * @param userId - The user ID to add as a member
 * @param role - Optional role to assign
 * @returns Promise resolving when member is added
 */
export const addMember = async (
  baseUrl: string,
  token: string,
  spaceId: string,
  userId: string,
  role?: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}/members`,
    method: 'POST',
    token,
    body: {
      user_id: userId,
      role,
    },
  });
};

/**
 * Remove a member from a workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space
 * @param userId - The user ID to remove from the space
 * @returns Promise resolving when member is removed
 */
export const removeMember = async (
  baseUrl: string,
  token: string,
  spaceId: string,
  userId: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}/members/${userId}`,
    method: 'DELETE',
    token,
  });
};

/**
 * List all members of a workspace space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The unique identifier of the space
 * @returns Promise resolving to array of space members
 */
export const listMembers = async (
  baseUrl: string,
  token: string,
  spaceId: string,
): Promise<Array<{ user_id: string; role: string }>> => {
  return requestDatalayerAPI<Array<{ user_id: string; role: string }>>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}/members`,
    method: 'GET',
    token,
  });
};
