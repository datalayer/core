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

import { spaces, notebooks, users, lexicals, items } from '../../../api/spacer';
import type {
  Space,
  CreateSpaceRequest,
  CreateSpaceResponse,
  CreateNotebookResponse,
  GetNotebookResponse,
  UpdateNotebookRequest,
  UpdateNotebookResponse,
  CreateLexicalResponse,
  GetLexicalResponse,
  UpdateLexicalRequest,
  UpdateLexicalResponse,
  GetSpaceItemsResponse,
  DeleteSpaceItemResponse,
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
    // User
    // ========================================================================

    /**
     * Get all workspaces for the authenticated user.
     *
     * @returns Promise resolving to user's spaces
     *
     * @example
     * ```typescript
     * const mySpaces = await sdk.getMySpaces();
     * console.log('My spaces:', mySpaces.length);
     * mySpaces.forEach(space => {
     *   console.log(`- ${space.name} (${space.visibility})`);
     * });
     * ```
     */
    async getMySpaces(): Promise<Space[]> {
      const token = (this as any).getToken();
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const response = await users.getMySpaces(token, spacerRunUrl);
      return response.spaces;
    }

    // ========================================================================
    // Spaces
    // ========================================================================

    /**
     * Create a new workspace.
     *
     * @param data - Space creation parameters
     * @returns Promise resolving to created space response
     *
     * @example
     * ```typescript
     * const response = await sdk.createSpace({
     *   name: 'My Research Project',
     *   description: 'Data analysis workspace',
     *   variant: 'default',
     *   spaceHandle: 'research-project',
     *   organizationId: 'org-123',
     *   seedSpaceId: 'seed-456',
     *   public: false
     * });
     * console.log('Space created:', response.space.name);
     * ```
     */
    async createSpace(data: CreateSpaceRequest): Promise<CreateSpaceResponse> {
      const token = (this as any).getToken();
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      return await spaces.createSpace(token, data, spacerRunUrl);
    }

    // ========================================================================
    // Notebooks
    // ========================================================================

    /**
     * Create a new notebook.
     *
     * @param data - Notebook creation parameters
     * @returns Promise resolving to created notebook response
     *
     * @example
     * ```typescript
     * const formData = new FormData();
     * formData.append('spaceId', 'space-123');
     * formData.append('notebookType', 'jupyter');
     * formData.append('name', 'Data Analysis');
     * formData.append('description', 'Analysis notebook');
     * // Optionally add file
     * formData.append('file', notebookFile);
     *
     * const response = await sdk.createNotebook(formData);
     * console.log('Notebook created:', response.notebook.name);
     * ```
     */
    async createNotebook(data: FormData): Promise<CreateNotebookResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await notebooks.create(spacerRunUrl, token, data);
    }

    /**
     * Get a notebook by ID.
     *
     * @param notebookId - Notebook ID
     * @returns Promise resolving to notebook details or undefined if not found
     *
     * @example
     * ```typescript
     * const response = await sdk.getNotebook('notebook-123');
     * if (response.notebook) {
     *   console.log('Notebook:', response.notebook.name);
     * } else {
     *   console.log('Notebook not found:', response.message);
     * }
     * ```
     */
    async getNotebook(notebookId: string): Promise<GetNotebookResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await notebooks.get(spacerRunUrl, token, notebookId);
    }

    /**
     * Update a notebook.
     *
     * @param notebookId - Notebook ID
     * @param data - Update data with optional name and/or description
     * @returns Promise resolving to updated notebook response
     *
     * @example
     * ```typescript
     * const response = await sdk.updateNotebook('notebook-123', {
     *   name: 'Updated Analysis',
     *   description: 'Updated description'
     * });
     * console.log('Notebook updated:', response.notebook.name);
     * ```
     */
    async updateNotebook(
      notebookId: string,
      data: UpdateNotebookRequest,
    ): Promise<UpdateNotebookResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await notebooks.update(spacerRunUrl, token, notebookId, data);
    }

    // ========================================================================
    // Lexicals
    // ========================================================================

    /**
     * Create a new lexical document.
     *
     * @param data - Document creation parameters as FormData
     * @returns Promise resolving to created document response
     *
     * @example
     * ```typescript
     * const formData = new FormData();
     * formData.append('spaceId', 'space-123');
     * formData.append('documentType', 'lexical');
     * formData.append('name', 'Project Documentation');
     * formData.append('description', 'Main project docs');
     * // Optionally add file
     * formData.append('file', documentFile);
     *
     * const response = await sdk.createLexical(formData);
     * console.log('Document created:', response.document.name);
     * ```
     */
    async createLexical(data: FormData): Promise<CreateLexicalResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await lexicals.createLexical(spacerRunUrl, token, data);
    }

    /**
     * Get a lexical document by ID.
     *
     * @param lexicalId - Document ID
     * @returns Promise resolving to document details or undefined if not found
     *
     * @example
     * ```typescript
     * const response = await sdk.getLexical('lexical-123');
     * if (response.document) {
     *   console.log('Document:', response.document.name);
     * } else {
     *   console.log('Document not found:', response.message);
     * }
     * ```
     */
    async getLexical(lexicalId: string): Promise<GetLexicalResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await lexicals.getLexical(spacerRunUrl, token, lexicalId);
    }

    /**
     * Update a lexical document.
     *
     * @param lexicalId - Document ID
     * @param data - Update data with optional name and/or description
     * @returns Promise resolving to updated document response
     *
     * @example
     * ```typescript
     * const response = await sdk.updateLexical('lexical-123', {
     *   name: 'Updated Documentation',
     *   description: 'Updated description'
     * });
     * console.log('Document updated:', response.document.name);
     * ```
     */
    async updateLexical(
      lexicalId: string,
      data: UpdateLexicalRequest,
    ): Promise<UpdateLexicalResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await lexicals.updateLexical(spacerRunUrl, token, lexicalId, data);
    }

    // ========================================================================
    // Items
    // ========================================================================

    /**
     * Get the items of a space.
     *
     * @param spaceId - Space ID
     * @returns Promise resolving to space items
     *
     * @example
     * ```typescript
     * const response = await sdk.getSpaceItems('space-123');
     * console.log('Space items:', response.items.length);
     * response.items.forEach(item => {
     *   console.log(`- ${item.name} (${item.type})`);
     * });
     * ```
     */
    async getSpaceItems(spaceId: string): Promise<GetSpaceItemsResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await items.getSpaceItems(spacerRunUrl, token, spaceId);
    }

    /**
     * Delete an item from a space.
     *
     * @param itemId - Item ID to delete
     * @returns Promise resolving when deletion is complete
     *
     * @example
     * ```typescript
     * const response = await sdk.deleteSpaceItem('item-123');
     * console.log('Item deleted:', response.message);
     * ```
     */
    async deleteSpaceItem(itemId: string): Promise<DeleteSpaceItemResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await items.deleteItem(spacerRunUrl, token, itemId);
    }
  };
}
