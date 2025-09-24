/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/items
 * @description Items API functions for the Datalayer platform.
 *
 * Provides functions for managing items in spaces.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import {
  DeleteSpaceItemResponse,
  GetSpaceItemsResponse,
} from '../types/spacer';

/**
 * Get the items of a space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param spaceId - The space ID
 * @returns Promise resolving to the items response
 */
export const getSpaceItems = async (
  baseUrl: string,
  token: string,
  spaceId: string,
): Promise<GetSpaceItemsResponse> => {
  return requestDatalayerAPI<GetSpaceItemsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/${spaceId}/items`,
    method: 'GET',
    token,
  });
};

/**
 * Delete an item from a space.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param id - The item ID to delete
 * @returns Promise resolving when deletion is complete
 */
export const deleteItem = async (
  baseUrl: string,
  token: string,
  id: string,
): Promise<DeleteSpaceItemResponse> => {
  return requestDatalayerAPI<DeleteSpaceItemResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/spaces/items/${id}`,
    method: 'DELETE',
    token,
  });
};
