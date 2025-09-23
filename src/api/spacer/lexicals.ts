/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/lexicals
 * @description Lexical documents API functions for the Datalayer platform.
 *
 * Provides functions for managing lexical (rich text) documents.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';

/**
 * Create a new lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Lexical document creation configuration
 * @returns Promise resolving to the created lexical document
 */
export const create = async (
  baseUrl: string,
  token: string,
  data: any,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * Get details for a specific lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param lexicalId - The unique identifier of the lexical document
 * @returns Promise resolving to lexical document details
 */
export const get = async (
  baseUrl: string,
  token: string,
  lexicalId: string,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals/${lexicalId}`,
    method: 'GET',
    token,
  });
};

/**
 * Update an existing lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param lexicalId - The unique identifier of the lexical document
 * @param data - Complete lexical document data to update
 * @returns Promise resolving to updated lexical document
 */
export const update = async (
  baseUrl: string,
  token: string,
  lexicalId: string,
  data: any,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals/${lexicalId}`,
    method: 'PUT',
    token,
    body: data,
  });
};

/**
 * Update the content model of a lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param lexicalId - The unique identifier of the lexical document
 * @param model - The content model data to update
 * @returns Promise resolving to updated lexical document
 */
export const updateModel = async (
  baseUrl: string,
  token: string,
  lexicalId: string,
  model: any,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals/${lexicalId}/model`,
    method: 'PUT',
    token,
    body: model,
  });
};

/**
 * Clone an existing lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param lexicalId - The unique identifier of the lexical document to clone
 * @param data - Optional clone configuration and modifications
 * @returns Promise resolving to the cloned lexical document
 */
export const clone = async (
  baseUrl: string,
  token: string,
  lexicalId: string,
  data?: any,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals/${lexicalId}/clone`,
    method: 'POST',
    token,
    body: data || {},
  });
};
