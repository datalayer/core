/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/notebooks
 * @description Jupyter notebooks API functions for the Datalayer platform.
 *
 * Provides functions for managing Jupyter notebooks within workspaces.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import {
  Notebook,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  CloneNotebookRequest,
  NotebooksListParams,
  NotebooksListResponse,
} from '../types/spacer';

/**
 * Create a new Jupyter notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Notebook creation configuration
 * @returns Promise resolving to the created notebook
 */
export const create = async (
  baseUrl: string,
  token: string,
  data: CreateNotebookRequest,
): Promise<Notebook> => {
  return requestDatalayerAPI<Notebook>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * List all accessible notebooks.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param params - Optional filtering and pagination parameters
 * @returns Promise resolving to list of notebooks
 */
export const list = async (
  baseUrl: string,
  token: string,
  params?: NotebooksListParams,
): Promise<NotebooksListResponse> => {
  return requestDatalayerAPI<NotebooksListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific notebook by ID.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @returns Promise resolving to notebook details
 */
export const get = async (
  baseUrl: string,
  token: string,
  notebookId: string,
): Promise<Notebook> => {
  return requestDatalayerAPI<Notebook>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}`,
    method: 'GET',
    token,
  });
};

/**
 * Get details for a specific notebook by UID.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param uid - The unique identifier (UID) of the notebook
 * @returns Promise resolving to notebook details
 */
export const getByUid = async (
  baseUrl: string,
  token: string,
  uid: string,
): Promise<Notebook> => {
  return requestDatalayerAPI<Notebook>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/uid/${uid}`,
    method: 'GET',
    token,
  });
};

/**
 * Update an existing notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param data - Notebook data to update
 * @returns Promise resolving to updated notebook details
 */
export const update = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  data: UpdateNotebookRequest,
): Promise<Notebook> => {
  return requestDatalayerAPI<Notebook>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}`,
    method: 'PATCH',
    token,
    body: data,
  });
};

/**
 * Delete a notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook to delete
 * @returns Promise resolving when deletion is complete
 */
export const remove = async (
  baseUrl: string,
  token: string,
  notebookId: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Clone an existing notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param data - Clone configuration including source and target details
 * @returns Promise resolving to the cloned notebook
 */
export const clone = async (
  baseUrl: string,
  token: string,
  data: CloneNotebookRequest,
): Promise<Notebook> => {
  return requestDatalayerAPI<Notebook>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/clone`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * Get the content of a notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @returns Promise resolving to notebook content
 */
export const getContent = async (
  baseUrl: string,
  token: string,
  notebookId: string,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/content`,
    method: 'GET',
    token,
  });
};

/**
 * Update the content of a notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param content - Complete notebook content in Jupyter format
 * @returns Promise resolving when content is updated
 */
export const updateContent = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  content: any,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/content`,
    method: 'PUT',
    token,
    body: content,
  });
};

/**
 * Execute a notebook or specific cell.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param cellId - Optional specific cell ID to execute
 * @returns Promise resolving to execution results
 */
export const execute = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  cellId?: string,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/execute`,
    method: 'POST',
    token,
    body: {
      cell_id: cellId,
    },
  });
};

/**
 * Get collaboration document for real-time editing.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookUid - The unique identifier (UID) of the notebook
 * @returns Promise resolving to collaboration document state
 */
export const getCollaborationDocument = async (
  baseUrl: string,
  token: string,
  notebookUid: string,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/documents/${notebookUid}`,
    method: 'GET',
    token,
  });
};

/**
 * Update collaboration document for real-time editing.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookUid - The unique identifier (UID) of the notebook
 * @param update - Collaboration update data
 * @returns Promise resolving when update is applied
 */
export const updateCollaborationDocument = async (
  baseUrl: string,
  token: string,
  notebookUid: string,
  update: any,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/documents/${notebookUid}`,
    method: 'PUT',
    token,
    body: update,
  });
};
