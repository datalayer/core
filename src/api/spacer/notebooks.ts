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
import { API_BASE_PATHS } from '../constants';
import {
  CreateNotebookResponse,
  GetNotebookResponse,
  UpdateNotebookRequest,
  UpdateNotebookResponse,
} from '../types/spacer';

/**
 * Create a new Jupyter notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Notebook creation configuration as FormData
 * @returns Promise resolving to the created notebook response
 */
export const createNotebook = async (
  baseUrl: string,
  token: string,
  data: FormData,
): Promise<CreateNotebookResponse> => {
  return requestDatalayerAPI<CreateNotebookResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks`,
    method: 'POST',
    token,
    body: data,
    // FormData automatically sets the correct Content-Type with boundary
  });
};

/**
 * Get a notebook by ID.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param id - The notebook ID
 * @returns Promise resolving to the notebook response
 */
export const getNotebook = async (
  baseUrl: string,
  token: string,
  id: string,
): Promise<GetNotebookResponse> => {
  return requestDatalayerAPI<GetNotebookResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${id}`,
    method: 'GET',
    token,
  });
};

/**
 * Update a notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param id - The notebook ID
 * @param data - Update data containing name and/or description
 * @returns Promise resolving to the updated notebook response
 */
export const updateNotebook = async (
  baseUrl: string,
  token: string,
  id: string,
  data: UpdateNotebookRequest,
): Promise<UpdateNotebookResponse> => {
  return requestDatalayerAPI<UpdateNotebookResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${id}`,
    method: 'PUT',
    token,
    body: data,
  });
};
