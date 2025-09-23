/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/cells
 * @description Notebook cells API functions for the Datalayer platform.
 *
 * Provides functions for managing individual notebook cells.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS } from '../constants';
import { Cell } from '../types/spacer';

/**
 * Create a new cell in a notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param cell - Cell data including type, source, and metadata
 * @returns Promise resolving to the created cell
 */
export const create = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  cell: Cell,
): Promise<Cell> => {
  return requestDatalayerAPI<Cell>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/cells`,
    method: 'POST',
    token,
    body: cell,
  });
};

/**
 * Get details for a specific cell.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param cellId - The unique identifier of the cell
 * @returns Promise resolving to cell details
 */
export const get = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  cellId: string,
): Promise<Cell> => {
  return requestDatalayerAPI<Cell>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/cells/${cellId}`,
    method: 'GET',
    token,
  });
};

/**
 * Update an existing cell.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param cellId - The unique identifier of the cell
 * @param data - Partial cell data to update
 * @returns Promise resolving to updated cell details
 */
export const update = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  cellId: string,
  data: Partial<Cell>,
): Promise<Cell> => {
  return requestDatalayerAPI<Cell>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/cells/${cellId}`,
    method: 'PATCH',
    token,
    body: data,
  });
};

/**
 * Delete a cell from a notebook.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param cellId - The unique identifier of the cell to delete
 * @returns Promise resolving when deletion is complete
 */
export const remove = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  cellId: string,
): Promise<void> => {
  return requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/cells/${cellId}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Execute a specific cell.
 * @param baseUrl - Base URL for the API
 * @param token - Authentication token
 * @param notebookId - The unique identifier of the notebook
 * @param cellId - The unique identifier of the cell to execute
 * @returns Promise resolving to execution results
 */
export const execute = async (
  baseUrl: string,
  token: string,
  notebookId: string,
  cellId: string,
): Promise<any> => {
  return requestDatalayerAPI<any>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/notebooks/${notebookId}/cells/${cellId}/execute`,
    method: 'POST',
    token,
  });
};
