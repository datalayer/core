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
  CreateSpaceRequest,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  CreateLexicalRequest,
  UpdateLexicalRequest,
  GetSpaceItemsResponse,
  DeleteSpaceItemResponse,
} from '../../../api/types/spacer';
import type { Constructor } from '../utils/mixins';
import { Notebook } from '../models/Notebook';
import { Lexical } from '../models/Lexical';
import { Space } from '../models/Space';

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
     * @returns Promise resolving to array of Space instances
     *
     * @example
     * ```typescript
     * const mySpaces = await sdk.getMySpaces();
     * console.log('My spaces:', mySpaces.length);
     * for (const space of mySpaces) {
     *   const name = await space.getName();
     *   console.log(`- ${name} (${space.visibility})`);
     * }
     * ```
     */
    async getMySpaces(): Promise<Space[]> {
      const token = (this as any).getToken();
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const response = await users.getMySpaces(token, spacerRunUrl);
      return response.spaces.map(s => new Space(s, this as any));
    }

    // ========================================================================
    // Spaces
    // ========================================================================

    /**
     * Create a new workspace.
     *
     * @param data - Space creation parameters
     * @returns Promise resolving to created Space instance
     *
     * @example
     * ```typescript
     * const space = await sdk.createSpace({
     *   name: 'My Research Project',
     *   description: 'Data analysis workspace',
     *   variant: 'default',
     *   spaceHandle: 'research-project',
     *   organizationId: 'org-123',
     *   seedSpaceId: 'seed-456',
     *   public: false
     * });
     * const name = await space.getName();
     * console.log('Space created:', name);
     * ```
     */
    async createSpace(data: CreateSpaceRequest): Promise<Space> {
      const token = (this as any).getToken();
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const response = await spaces.createSpace(token, data, spacerRunUrl);
      return new Space(response.space, this as any);
    }

    // ========================================================================
    // Notebooks
    // ========================================================================

    // ========================================================================
    // Helper Functions
    // ========================================================================

    _extractNotebookId(notebookIdOrInstance: string | Notebook): string {
      return typeof notebookIdOrInstance === 'string'
        ? notebookIdOrInstance
        : notebookIdOrInstance.uid;
    }

    _extractLexicalId(lexicalIdOrInstance: string | Lexical): string {
      return typeof lexicalIdOrInstance === 'string'
        ? lexicalIdOrInstance
        : lexicalIdOrInstance.uid;
    }

    /**
     * Create a new notebook.
     *
     * @param data - Notebook creation parameters
     * @returns Promise resolving to created Notebook instance
     *
     * @example
     * ```typescript
     * const notebook = await sdk.createNotebook({
     *   spaceId: 'space-123',
     *   name: 'Data Analysis',
     *   description: 'Analysis notebook',
     *   notebookType: 'jupyter',
     * });
     * ```
     */
    async createNotebook(data: CreateNotebookRequest): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await notebooks.createNotebook(
        spacerRunUrl,
        token,
        data,
      );
      return new Notebook(response.notebook, this as any);
    }

    /**
     * Get a notebook by ID or Notebook instance.
     *
     * @param idOrNotebook - Notebook ID (string) or Notebook instance
     * @returns Promise resolving to Notebook instance
     *
     * @example
     * ```typescript
     * const notebook = await sdk.getNotebook('notebook-123');
     * const refreshed = await sdk.getNotebook(notebook);
     * ```
     */
    async getNotebook(idOrNotebook: string | Notebook): Promise<Notebook> {
      const notebookId = this._extractNotebookId(idOrNotebook);
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await notebooks.getNotebook(
        spacerRunUrl,
        token,
        notebookId,
      );

      if (!response.notebook) {
        throw new Error(`Notebook with ID '${notebookId}' not found`);
      }

      return new Notebook(response.notebook, this as any);
    }

    /**
     * Update a notebook.
     *
     * @param idOrNotebook - Notebook ID (string) or Notebook instance
     * @param data - Update data with optional name and/or description
     * @returns Promise resolving to updated Notebook instance
     *
     * @example
     * ```typescript
     * const updated = await sdk.updateNotebook('notebook-123', {
     *   name: 'Updated Analysis',
     *   description: 'Updated description'
     * });
     * const updated2 = await sdk.updateNotebook(notebook, {
     *   name: 'Updated Analysis',
     *   description: 'Updated description'
     * });
     * ```
     */
    async updateNotebook(
      idOrNotebook: string | Notebook,
      data: UpdateNotebookRequest,
    ): Promise<Notebook> {
      const notebookId = this._extractNotebookId(idOrNotebook);
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await notebooks.updateNotebook(
        spacerRunUrl,
        token,
        notebookId,
        data,
      );
      return new Notebook(response.notebook, this as any);
    }

    // ========================================================================
    // Lexicals
    // ========================================================================

    /**
     * Create a new lexical document.
     *
     * @param data - Document creation parameters
     * @returns Promise resolving to created Lexical instance
     *
     * @example
     * ```typescript
     * const lexical = await sdk.createLexical({
     *   spaceId: 'space-123',
     *   name: 'Project Documentation',
     *   description: 'Main project docs',
     *   documentType: 'document',
     * });
     * ```
     */
    async createLexical(data: CreateLexicalRequest): Promise<Lexical> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await lexicals.createLexical(spacerRunUrl, token, data);
      return new Lexical(response.document, this as any);
    }

    /**
     * Get a lexical document by ID or Lexical instance.
     *
     * @param idOrLexical - Document ID (string) or Lexical instance
     * @returns Promise resolving to Lexical instance
     *
     * @example
     * ```typescript
     * const lexical = await sdk.getLexical('lexical-123');
     * const refreshed = await sdk.getLexical(lexical);
     * ```
     */
    async getLexical(idOrLexical: string | Lexical): Promise<Lexical> {
      const lexicalId = this._extractLexicalId(idOrLexical);
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await lexicals.getLexical(
        spacerRunUrl,
        token,
        lexicalId,
      );

      if (!response.document) {
        throw new Error(`Lexical document with ID '${lexicalId}' not found`);
      }

      return new Lexical(response.document, this as any);
    }

    /**
     * Update a lexical document.
     *
     * @param idOrLexical - Document ID (string) or Lexical instance
     * @param data - Update data with optional name and/or description
     * @returns Promise resolving to updated Lexical instance
     *
     * @example
     * ```typescript
     * const updated = await sdk.updateLexical('lexical-123', {
     *   name: 'Updated Documentation',
     *   description: 'Updated description'
     * });
     * const updated2 = await sdk.updateLexical(lexical, {
     *   name: 'Updated Documentation',
     *   description: 'Updated description'
     * });
     * ```
     */
    async updateLexical(
      idOrLexical: string | Lexical,
      data: UpdateLexicalRequest,
    ): Promise<Lexical> {
      const lexicalId = this._extractLexicalId(idOrLexical);
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await lexicals.updateLexical(
        spacerRunUrl,
        token,
        lexicalId,
        data,
      );
      return new Lexical(response.document, this as any);
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
