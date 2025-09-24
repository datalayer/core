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
  CreateLexicalRequest,
  CreateLexicalResponse,
  GetLexicalResponse,
  UpdateLexicalRequest,
  UpdateLexicalResponse,
} from '../types/spacer';

/**
 * Create a new lexical document.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Document creation configuration
 * @returns Promise resolving to the created document response
 */
export const createLexical = async (
  baseUrl: string,
  token: string,
  data: CreateLexicalRequest,
): Promise<CreateLexicalResponse> => {
  // Create FormData for multipart/form-data request (like the working example)
  const formData = new FormData();
  formData.append('spaceId', data.spaceId);
  formData.append('name', data.name);
  formData.append('documentType', data.documentType || 'lexical'); // Required field
  formData.append('description', data.description || ''); // Required field - can be empty

  // Add file if provided
  if (data.file) {
    if (data.file instanceof File) {
      formData.append('file', data.file, data.file.name);
    } else {
      // Handle Blob case
      formData.append('file', data.file, `${data.name}.json`);
    }
  }

  const url = `${baseUrl}${API_BASE_PATHS.SPACER}/lexicals`;
  return requestDatalayerAPI<CreateLexicalResponse>({
    url,
    method: 'POST',
    token,
    body: formData,
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
