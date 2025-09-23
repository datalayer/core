/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/mixins/SpacerMixin
 * @description Spacer mixin for the Datalayer SDK.
 *
 * This mixin provides intuitive methods for managing workspaces, notebooks,
 * and content that are mixed into the main DatalayerSDK class.
 */

import { spaces, notebooks, cells } from '../../../api/spacer';
import type {
  Space,
  Notebook,
  Cell,
  CreateSpaceRequest,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  CloneNotebookRequest,
} from '../../../api/types/spacer';
import type { Constructor } from '../utils/mixins';

/**
 * Spacer mixin that provides workspace and content management.
 *
 * This mixin is applied to the DatalayerSDK class to provide clean, intuitive
 * methods for managing spaces, notebooks, and cells.
 */
export function SpacerMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // ========================================================================
    // Spaces
    // ========================================================================

    /**
     * Create a new workspace.
     *
     * @param data - Space creation parameters
     * @returns Promise resolving to created space
     *
     * @example
     * ```typescript
     * const space = await sdk.createSpace({
     *   name: 'My Research Project',
     *   description: 'Data analysis workspace'
     * });
     * console.log('Space created:', space.name);
     * ```
     */
    async createSpace(data: CreateSpaceRequest): Promise<Space> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await spaces.create(spacerRunUrl, token, data);
    }

    /**
     * List all available workspaces.
     *
     * @returns Promise resolving to array of spaces
     *
     * @example
     * ```typescript
     * const allSpaces = await sdk.listSpaces();
     * console.log('Available spaces:', allSpaces.length);
     * ```
     */
    async listSpaces(): Promise<Space[]> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      const response = await spaces.list(spacerRunUrl, token);
      return response.spaces;
    }

    /**
     * Get details for a specific workspace.
     *
     * @param spaceId - Space ID
     * @returns Promise resolving to space details
     *
     * @example
     * ```typescript
     * const space = await sdk.getSpace('space-123');
     * console.log('Space:', space.name);
     * ```
     */
    async getSpace(spaceId: string): Promise<Space> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await spaces.get(spacerRunUrl, token, spaceId);
    }

    /**
     * Delete a workspace permanently.
     *
     * @param spaceId - Space ID
     *
     * @example
     * ```typescript
     * await sdk.deleteSpace('space-123');
     * console.log('Space deleted');
     * ```
     */
    async deleteSpace(spaceId: string): Promise<void> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      await spaces.remove(spacerRunUrl, token, spaceId);
    }

    // ========================================================================
    // Notebooks
    // ========================================================================

    /**
     * Create a new notebook.
     *
     * @param data - Notebook creation parameters
     * @returns Promise resolving to created notebook
     *
     * @example
     * ```typescript
     * const notebook = await sdk.createNotebook({
     *   space_id: 'space-123',
     *   name: 'Data Analysis',
     *   content: { cells: [] }
     * });
     * console.log('Notebook created:', notebook.name);
     * ```
     */
    async createNotebook(data: CreateNotebookRequest): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await notebooks.create(spacerRunUrl, token, data);
    }

    /**
     * List all notebooks.
     *
     * @param spaceId - Optional space ID to filter notebooks
     * @returns Promise resolving to array of notebooks
     *
     * @example
     * ```typescript
     * const allNotebooks = await sdk.listNotebooks();
     * const spaceNotebooks = await sdk.listNotebooks('space-123');
     * ```
     */
    async listNotebooks(spaceId?: string): Promise<Notebook[]> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      const params = spaceId ? { space_id: spaceId } : undefined;
      const response = await notebooks.list(spacerRunUrl, token, params);
      return response.notebooks;
    }

    /**
     * Get details for a specific notebook.
     *
     * @param notebookId - Notebook ID
     * @returns Promise resolving to notebook details
     *
     * @example
     * ```typescript
     * const notebook = await sdk.getNotebook('notebook-123');
     * console.log('Notebook:', notebook.name);
     * ```
     */
    async getNotebook(notebookId: string): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await notebooks.get(spacerRunUrl, token, notebookId);
    }

    /**
     * Get a notebook by its UID.
     *
     * @param uid - Notebook UID
     * @returns Promise resolving to notebook details
     *
     * @example
     * ```typescript
     * const notebook = await sdk.getNotebookByUid('notebook-uid-123');
     * console.log('Notebook:', notebook.name);
     * ```
     */
    async getNotebookByUid(uid: string): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await notebooks.getByUid(spacerRunUrl, token, uid);
    }

    /**
     * Update notebook details.
     *
     * @param notebookId - Notebook ID
     * @param data - Update parameters
     * @returns Promise resolving to updated notebook
     *
     * @example
     * ```typescript
     * const notebook = await sdk.updateNotebook('notebook-123', {
     *   name: 'Updated Analysis'
     * });
     * console.log('Notebook updated:', notebook.name);
     * ```
     */
    async updateNotebook(
      notebookId: string,
      data: UpdateNotebookRequest,
    ): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await notebooks.update(spacerRunUrl, token, notebookId, data);
    }

    /**
     * Clone an existing notebook.
     *
     * @param data - Clone parameters
     * @returns Promise resolving to cloned notebook
     *
     * @example
     * ```typescript
     * const cloned = await sdk.cloneNotebook({
     *   source_notebook_id: 'notebook-123',
     *   name: 'Cloned Analysis'
     * });
     * console.log('Notebook cloned:', cloned.name);
     * ```
     */
    async cloneNotebook(data: CloneNotebookRequest): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await notebooks.clone(spacerRunUrl, token, data);
    }

    /**
     * Get the content of a notebook.
     *
     * @param notebookId - Notebook ID
     * @returns Promise resolving to notebook content
     *
     * @example
     * ```typescript
     * const content = await sdk.getNotebookContent('notebook-123');
     * console.log('Cells:', content.cells.length);
     * ```
     */
    async getNotebookContent(notebookId: string): Promise<any> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await notebooks.getContent(spacerRunUrl, token, notebookId);
    }

    /**
     * Update the content of a notebook.
     *
     * @param notebookId - Notebook ID
     * @param content - New notebook content
     *
     * @example
     * ```typescript
     * await sdk.updateNotebookContent('notebook-123', {
     *   cells: [
     *     { cell_type: 'code', source: 'print("Hello, World!")' }
     *   ]
     * });
     * console.log('Notebook content updated');
     * ```
     */
    async updateNotebookContent(
      notebookId: string,
      content: any,
    ): Promise<void> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      await notebooks.updateContent(spacerRunUrl, token, notebookId, content);
    }

    /**
     * Delete a notebook permanently.
     *
     * @param notebookId - Notebook ID
     *
     * @example
     * ```typescript
     * await sdk.deleteNotebook('notebook-123');
     * console.log('Notebook deleted');
     * ```
     */
    async deleteNotebook(notebookId: string): Promise<void> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      await notebooks.remove(spacerRunUrl, token, notebookId);
    }

    // ========================================================================
    // Cells
    // ========================================================================

    /**
     * Create a new cell in a notebook.
     *
     * @param notebookId - Notebook ID
     * @param cell - Cell data
     * @returns Promise resolving to created cell
     *
     * @example
     * ```typescript
     * const cell = await sdk.createCell('notebook-123', {
     *   cell_type: 'code',
     *   source: 'print("New cell")'
     * });
     * console.log('Cell created:', cell.id);
     * ```
     */
    async createCell(notebookId: string, cell: Cell): Promise<Cell> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await cells.create(spacerRunUrl, token, notebookId, cell);
    }

    /**
     * Get a specific cell from a notebook.
     *
     * @param notebookId - Notebook ID
     * @param cellId - Cell ID
     * @returns Promise resolving to cell details
     *
     * @example
     * ```typescript
     * const cell = await sdk.getCell('notebook-123', 'cell-456');
     * console.log('Cell type:', cell.cell_type);
     * ```
     */
    async getCell(notebookId: string, cellId: string): Promise<Cell> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      return await cells.get(spacerRunUrl, token, notebookId, cellId);
    }

    /**
     * Delete a cell from a notebook.
     *
     * @param notebookId - Notebook ID
     * @param cellId - Cell ID
     *
     * @example
     * ```typescript
     * await sdk.deleteCell('notebook-123', 'cell-456');
     * console.log('Cell deleted');
     * ```
     */
    async deleteCell(notebookId: string, cellId: string): Promise<void> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      if (!token) {
        throw new Error('Authentication token required');
      }

      await cells.remove(spacerRunUrl, token, notebookId, cellId);
    }
  };
}
