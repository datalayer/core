/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/lexicals
 * @description Lexical documents API functions for the Datalayer platform.
 *
 * Provides functions for creating, retrieving, and updating lexical (rich text) documents.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import {
  CreateLexicalResponse,
  GetLexicalResponse,
  UpdateLexicalRequest,
  UpdateLexicalResponse,
} from '../types/spacer';

/**
 * Create a new lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Document creation configuration as FormData
 * @returns Promise resolving to the created document response
 */
export const createLexical = async (
  baseUrl: string,
  token: string,
  data: FormData,
): Promise<CreateLexicalResponse> => {
  return requestDatalayerAPI<CreateLexicalResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals`,
    method: 'POST',
    token,
    body: data,
    // FormData automatically sets the correct Content-Type with boundary
  });
};

/**
 * Get a lexical document by ID.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param id - The document ID
 * @returns Promise resolving to the document response
 */
export const getLexical = async (
  baseUrl: string,
  token: string,
  id: string,
): Promise<GetLexicalResponse> => {
  return requestDatalayerAPI<GetLexicalResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals/${id}`,
    method: 'GET',
    token,
  });
};

/**
 * Update a lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param id - The document ID
 * @param data - Update data containing name and/or description
 * @returns Promise resolving to the updated document response
 */
export const updateLexical = async (
  baseUrl: string,
  token: string,
  id: string,
  data: UpdateLexicalRequest,
): Promise<UpdateLexicalResponse> => {
  return requestDatalayerAPI<UpdateLexicalResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals/${id}`,
    method: 'PUT',
    token,
    body: data,
  });
};
