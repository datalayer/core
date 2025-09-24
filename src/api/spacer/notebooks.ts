/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/notebooks
 * @description Jupyter notebooks API functions for the Datalayer platform.
 *
 * Provides functions for creating and retrieving Jupyter notebooks within workspaces.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import {
  CreateNotebookRequest,
  CreateNotebookResponse,
  GetNotebookResponse,
  UpdateNotebookRequest,
  UpdateNotebookResponse,
} from '../types/spacer';

/**
 * Create a new Jupyter notebook.
 * @param token - Authentication token
 * @param data - Notebook creation configuration
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the created notebook response
 */
export const createNotebook = async (
  token: string,
  data: CreateNotebookRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<CreateNotebookResponse> => {
  // Create FormData for multipart/form-data request (like the working example)
  const formData = new FormData();
  formData.append('spaceId', data.spaceId);
  formData.append('name', data.name);
  formData.append('notebookType', data.notebookType || 'jupyter'); // Required field
  formData.append('description', data.description || ''); // Required field - can be empty

  // Add file if provided
  if (data.file) {
    if (data.file instanceof File) {
      formData.append('file', data.file, data.file.name);
    } else {
      // Handle Blob case
      formData.append('file', data.file, `${data.name}.ipynb`);
    }
  }

  const url = `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks`;
  return requestDatalayerAPI<CreateNotebookResponse>({
    url,
    method: 'POST',
    token,
    body: formData,
  });
};

/**
 * Get a notebook by ID.
 * @param token - Authentication token
 * @param id - The notebook ID
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the notebook response
 */
export const getNotebook = async (
  token: string,
  id: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<GetNotebookResponse> => {
  return requestDatalayerAPI<GetNotebookResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${id}`,
    method: 'GET',
    token,
  });
};

/**
 * Update a notebook.
 * @param token - Authentication token
 * @param id - The notebook ID
 * @param data - Update data containing name and/or description
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the updated notebook response
 */
export const updateNotebook = async (
  token: string,
  id: string,
  data: UpdateNotebookRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<UpdateNotebookResponse> => {
  return requestDatalayerAPI<UpdateNotebookResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${id}`,
    method: 'PUT',
    token,
    body: data,
  });
};
