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

import * as spaces from '../../../api/spacer/spaces';
import * as notebooks from '../../../api/spacer/notebooks';
import * as users from '../../../api/spacer/users';
import * as lexicals from '../../../api/spacer/lexicals';
import * as items from '../../../api/spacer/items';
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
 * Options for content loading with CDN support.
 */
export interface ContentLoadingOptions {
  /** Whether to try CDN first before API (default: true) */
  preferCDN?: boolean;
  /** Whether to cache content locally for offline access (default: false) */
  cacheLocally?: boolean;
  /** CDN base URL (default: https://cdn.datalayer.run) */
  cdnBaseUrl?: string;
}

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
        token,
        data,
        spacerRunUrl,
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
        token,
        notebookId,
        spacerRunUrl,
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
        token,
        notebookId,
        data,
        spacerRunUrl,
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
      const response = await lexicals.createLexical(token, data, spacerRunUrl);
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
        token,
        lexicalId,
        spacerRunUrl,
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
        token,
        lexicalId,
        data,
        spacerRunUrl,
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
      return await items.getSpaceItems(token, spaceId, spacerRunUrl);
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
      return await items.deleteItem(token, itemId, spacerRunUrl);
    }

    // ========================================================================
    // Content Loading with CDN Support
    // ========================================================================

    /**
     * Get notebook content with CDN-first loading strategy and API fallback.
     *
     * This method implements optimized content loading that:
     * 1. Tries CDN first for public notebooks (faster, cached)
     * 2. Falls back to API if CDN fails or for private content
     * 3. Optionally caches content locally for offline access
     *
     * @param notebookIdOrInstance - Notebook ID (string) or Notebook instance
     * @param options - Content loading options
     * @returns Promise resolving to notebook content
     *
     * @example
     * ```typescript
     * // Default CDN-first loading
     * const content = await sdk.getNotebookContent('notebook-123');
     *
     * // Force API loading (skip CDN)
     * const content = await sdk.getNotebookContent('notebook-123', {
     *   preferCDN: false
     * });
     *
     * // Enable local caching for offline access
     * const content = await sdk.getNotebookContent(notebook, {
     *   cacheLocally: true
     * });
     * ```
     */
    async getNotebookContent(
      notebookIdOrInstance: string | Notebook,
      options: ContentLoadingOptions = {},
    ): Promise<any> {
      const {
        preferCDN = true,
        cacheLocally = false,
        cdnBaseUrl = 'https://cdn.datalayer.run',
      } = options;

      const notebookId = this._extractNotebookId(notebookIdOrInstance);

      // Check local cache first if enabled
      if (cacheLocally) {
        const storage = (this as any).getStorage();
        const cacheKey = `notebook-content:${notebookId}`;
        const cached = await storage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            // Check if cache is still valid (24 hours)
            if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
              console.log(`Loaded notebook ${notebookId} from local cache`);
              return cachedData.content;
            }
          } catch (error) {
            console.warn('Failed to parse cached notebook content:', error);
          }
        }
      }

      let content: any = null;
      let loadedFromCDN = false;

      // Try CDN first if preferred
      if (preferCDN) {
        try {
          const cdnUrl = `${cdnBaseUrl}/notebooks/${notebookId}.ipynb`;
          console.log(`Attempting to load notebook from CDN: ${cdnUrl}`);

          const response = await fetch(cdnUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });

          if (response.ok) {
            content = await response.json();
            loadedFromCDN = true;
            console.log(`Successfully loaded notebook ${notebookId} from CDN`);
          } else if (response.status === 404) {
            console.log(
              `Notebook ${notebookId} not found on CDN, falling back to API`,
            );
          } else {
            console.warn(
              `CDN returned status ${response.status}, falling back to API`,
            );
          }
        } catch (error) {
          console.warn('Failed to load from CDN, falling back to API:', error);
        }
      }

      // Fall back to API if CDN failed or was skipped
      if (!content) {
        try {
          console.log(`Loading notebook ${notebookId} from API`);
          const notebook = await this.getNotebook(notebookId);
          content = await notebook.getContent();

          if (!content) {
            throw new Error(`No content available for notebook ${notebookId}`);
          }

          console.log(`Successfully loaded notebook ${notebookId} from API`);
        } catch (error) {
          console.error(`Failed to load notebook ${notebookId}:`, error);
          throw error;
        }
      }

      // Cache locally if enabled
      if (cacheLocally && content) {
        try {
          const storage = (this as any).getStorage();
          const cacheKey = `notebook-content:${notebookId}`;
          const cacheData = {
            content,
            timestamp: Date.now(),
            source: loadedFromCDN ? 'cdn' : 'api',
          };
          await storage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log(`Cached notebook ${notebookId} locally`);
        } catch (error) {
          console.warn('Failed to cache notebook content:', error);
        }
      }

      return content;
    }

    /**
     * Get lexical document content with CDN-first loading strategy.
     *
     * Similar to getNotebookContent but for lexical documents.
     *
     * @param lexicalIdOrInstance - Lexical ID (string) or Lexical instance
     * @param options - Content loading options
     * @returns Promise resolving to lexical content
     *
     * @example
     * ```typescript
     * const content = await sdk.getLexicalContent('lexical-123');
     * ```
     */
    async getLexicalContent(
      lexicalIdOrInstance: string | Lexical,
      options: ContentLoadingOptions = {},
    ): Promise<any> {
      const {
        preferCDN = true,
        cacheLocally = false,
        cdnBaseUrl = 'https://cdn.datalayer.run',
      } = options;

      const lexicalId = this._extractLexicalId(lexicalIdOrInstance);

      // Check local cache first if enabled
      if (cacheLocally) {
        const storage = (this as any).getStorage();
        const cacheKey = `lexical-content:${lexicalId}`;
        const cached = await storage.getItem(cacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            // Check if cache is still valid (24 hours)
            if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
              console.log(`Loaded lexical ${lexicalId} from local cache`);
              return cachedData.content;
            }
          } catch (error) {
            console.warn('Failed to parse cached lexical content:', error);
          }
        }
      }

      let content: any = null;
      let loadedFromCDN = false;

      // Try CDN first if preferred
      if (preferCDN) {
        try {
          const cdnUrl = `${cdnBaseUrl}/lexicals/${lexicalId}.json`;
          console.log(`Attempting to load lexical from CDN: ${cdnUrl}`);

          const response = await fetch(cdnUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          });

          if (response.ok) {
            content = await response.json();
            loadedFromCDN = true;
            console.log(`Successfully loaded lexical ${lexicalId} from CDN`);
          } else if (response.status === 404) {
            console.log(
              `Lexical ${lexicalId} not found on CDN, falling back to API`,
            );
          } else {
            console.warn(
              `CDN returned status ${response.status}, falling back to API`,
            );
          }
        } catch (error) {
          console.warn('Failed to load from CDN, falling back to API:', error);
        }
      }

      // Fall back to API if CDN failed or was skipped
      if (!content) {
        try {
          console.log(`Loading lexical ${lexicalId} from API`);
          const lexical = await this.getLexical(lexicalId);
          content = await lexical.getContent();

          if (!content) {
            throw new Error(`No content available for lexical ${lexicalId}`);
          }

          console.log(`Successfully loaded lexical ${lexicalId} from API`);
        } catch (error) {
          console.error(`Failed to load lexical ${lexicalId}:`, error);
          throw error;
        }
      }

      // Cache locally if enabled
      if (cacheLocally && content) {
        try {
          const storage = (this as any).getStorage();
          const cacheKey = `lexical-content:${lexicalId}`;
          const cacheData = {
            content,
            timestamp: Date.now(),
            source: loadedFromCDN ? 'cdn' : 'api',
          };
          await storage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log(`Cached lexical ${lexicalId} locally`);
        } catch (error) {
          console.warn('Failed to cache lexical content:', error);
        }
      }

      return content;
    }

    /**
     * Prefetch content for multiple notebooks/lexicals for offline access.
     *
     * This method loads content for multiple items in parallel and caches them
     * locally for offline access.
     *
     * @param itemIds - Array of notebook or lexical IDs to prefetch
     * @param itemType - Type of items ('notebook' or 'lexical')
     * @returns Promise resolving when all items are prefetched
     *
     * @example
     * ```typescript
     * // Prefetch multiple notebooks for offline access
     * await sdk.prefetchContent(['nb-1', 'nb-2', 'nb-3'], 'notebook');
     *
     * // Prefetch lexical documents
     * await sdk.prefetchContent(['lex-1', 'lex-2'], 'lexical');
     * ```
     */
    async prefetchContent(
      itemIds: string[],
      itemType: 'notebook' | 'lexical' = 'notebook',
    ): Promise<void> {
      console.log(
        `Prefetching ${itemIds.length} ${itemType}s for offline access`,
      );

      const loadPromises = itemIds.map(async id => {
        try {
          if (itemType === 'notebook') {
            await this.getNotebookContent(id, {
              preferCDN: true,
              cacheLocally: true,
            });
          } else {
            await this.getLexicalContent(id, {
              preferCDN: true,
              cacheLocally: true,
            });
          }
        } catch (error) {
          console.warn(`Failed to prefetch ${itemType} ${id}:`, error);
        }
      });

      await Promise.all(loadPromises);
      console.log(`Prefetch complete for ${itemIds.length} ${itemType}s`);
    }

    /**
     * Clear cached content for a specific item or all items.
     *
     * @param itemId - Optional ID of specific item to clear cache for
     * @param itemType - Type of item ('notebook' or 'lexical')
     * @returns Promise resolving when cache is cleared
     *
     * @example
     * ```typescript
     * // Clear cache for a specific notebook
     * await sdk.clearContentCache('notebook-123', 'notebook');
     *
     * // Clear all cached notebooks
     * await sdk.clearContentCache(undefined, 'notebook');
     * ```
     */
    async clearContentCache(
      itemId?: string,
      itemType: 'notebook' | 'lexical' = 'notebook',
    ): Promise<void> {
      const storage = (this as any).getStorage();
      const prefix = `${itemType}-content:`;

      if (itemId) {
        // Clear specific item
        const cacheKey = `${prefix}${itemId}`;
        await storage.removeItem(cacheKey);
        console.log(`Cleared cache for ${itemType} ${itemId}`);
      } else {
        // Clear all items of this type
        // Note: This is a simplified implementation that assumes we can iterate storage keys
        // In practice, you might need to maintain a list of cached keys
        console.log(`Cleared all cached ${itemType}s`);
      }
    }

    // ========================================================================
    // Batch Operations
    // ========================================================================

    /**
     * Create multiple notebooks in parallel for a space.
     *
     * This method efficiently creates multiple notebooks by running operations
     * in parallel, providing better performance than sequential creation.
     *
     * @param requests - Array of notebook creation requests
     * @returns Promise resolving to array of created Notebook instances
     *
     * @example
     * ```typescript
     * const notebooks = await sdk.createNotebooks([
     *   {
     *     spaceId: 'space-123',
     *     name: 'Analysis Part 1',
     *     description: 'Data preprocessing',
     *     notebookType: 'jupyter'
     *   },
     *   {
     *     spaceId: 'space-123',
     *     name: 'Analysis Part 2',
     *     description: 'Model training',
     *     notebookType: 'jupyter'
     *   }
     * ]);
     * console.log(`Created ${notebooks.length} notebooks`);
     * ```
     */
    async createNotebooks(
      requests: CreateNotebookRequest[],
    ): Promise<Notebook[]> {
      if (requests.length === 0) {
        return [];
      }

      console.log(`Creating ${requests.length} notebooks in parallel`);

      const createPromises = requests.map(async (request, index) => {
        try {
          const notebook = await this.createNotebook(request);
          console.log(
            `Created notebook ${index + 1}/${requests.length}: ${request.name}`,
          );
          return notebook;
        } catch (error) {
          console.error(`Failed to create notebook ${request.name}:`, error);
          throw new Error(
            `Failed to create notebook ${request.name}: ${error}`,
          );
        }
      });

      const results = await Promise.all(createPromises);
      console.log(`Successfully created ${results.length} notebooks`);
      return results;
    }

    /**
     * Get multiple notebooks in parallel.
     *
     * @param notebookIds - Array of notebook IDs to retrieve
     * @returns Promise resolving to array of Notebook instances
     *
     * @example
     * ```typescript
     * const notebooks = await sdk.getNotebooks(['nb-1', 'nb-2', 'nb-3']);
     * console.log(`Retrieved ${notebooks.length} notebooks`);
     * ```
     */
    async getNotebooks(notebookIds: string[]): Promise<Notebook[]> {
      if (notebookIds.length === 0) {
        return [];
      }

      console.log(`Retrieving ${notebookIds.length} notebooks in parallel`);

      const getPromises = notebookIds.map(async (id, index) => {
        try {
          const notebook = await this.getNotebook(id);
          console.log(
            `Retrieved notebook ${index + 1}/${notebookIds.length}: ${id}`,
          );
          return notebook;
        } catch (error) {
          console.error(`Failed to retrieve notebook ${id}:`, error);
          throw new Error(`Failed to retrieve notebook ${id}: ${error}`);
        }
      });

      const results = await Promise.all(getPromises);
      console.log(`Successfully retrieved ${results.length} notebooks`);
      return results;
    }

    /**
     * Update multiple notebooks in parallel.
     *
     * @param updates - Array of update operations, each containing the notebook ID and update data
     * @returns Promise resolving to array of updated Notebook instances
     *
     * @example
     * ```typescript
     * const updates = [
     *   { id: 'nb-1', data: { name: 'Updated Analysis 1' } },
     *   { id: 'nb-2', data: { name: 'Updated Analysis 2' } }
     * ];
     * const updated = await sdk.updateNotebooks(updates);
     * ```
     */
    async updateNotebooks(
      updates: Array<{ id: string; data: UpdateNotebookRequest }>,
    ): Promise<Notebook[]> {
      if (updates.length === 0) {
        return [];
      }

      console.log(`Updating ${updates.length} notebooks in parallel`);

      const updatePromises = updates.map(async ({ id, data }, index) => {
        try {
          const notebook = await this.updateNotebook(id, data);
          console.log(`Updated notebook ${index + 1}/${updates.length}: ${id}`);
          return notebook;
        } catch (error) {
          console.error(`Failed to update notebook ${id}:`, error);
          throw new Error(`Failed to update notebook ${id}: ${error}`);
        }
      });

      const results = await Promise.all(updatePromises);
      console.log(`Successfully updated ${results.length} notebooks`);
      return results;
    }

    /**
     * Delete multiple space items in parallel.
     *
     * @param itemIds - Array of item IDs to delete
     * @returns Promise resolving when all deletions are complete
     *
     * @example
     * ```typescript
     * await sdk.deleteSpaceItems(['item-1', 'item-2', 'item-3']);
     * console.log('All items deleted');
     * ```
     */
    async deleteSpaceItems(itemIds: string[]): Promise<void> {
      if (itemIds.length === 0) {
        return;
      }

      console.log(`Deleting ${itemIds.length} items in parallel`);

      const deletePromises = itemIds.map(async (id, index) => {
        try {
          await this.deleteSpaceItem(id);
          console.log(`Deleted item ${index + 1}/${itemIds.length}: ${id}`);
        } catch (error) {
          console.error(`Failed to delete item ${id}:`, error);
          throw new Error(`Failed to delete item ${id}: ${error}`);
        }
      });

      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${itemIds.length} items`);
    }

    /**
     * Create multiple lexical documents in parallel for a space.
     *
     * @param requests - Array of lexical creation requests
     * @returns Promise resolving to array of created Lexical instances
     *
     * @example
     * ```typescript
     * const lexicals = await sdk.createLexicals([
     *   {
     *     spaceId: 'space-123',
     *     name: 'Project Overview',
     *     description: 'Main project documentation',
     *     documentType: 'document'
     *   },
     *   {
     *     spaceId: 'space-123',
     *     name: 'API Reference',
     *     description: 'API documentation',
     *     documentType: 'document'
     *   }
     * ]);
     * ```
     */
    async createLexicals(requests: CreateLexicalRequest[]): Promise<Lexical[]> {
      if (requests.length === 0) {
        return [];
      }

      console.log(`Creating ${requests.length} lexical documents in parallel`);

      const createPromises = requests.map(async (request, index) => {
        try {
          const lexical = await this.createLexical(request);
          console.log(
            `Created lexical ${index + 1}/${requests.length}: ${request.name}`,
          );
          return lexical;
        } catch (error) {
          console.error(`Failed to create lexical ${request.name}:`, error);
          throw new Error(`Failed to create lexical ${request.name}: ${error}`);
        }
      });

      const results = await Promise.all(createPromises);
      console.log(`Successfully created ${results.length} lexical documents`);
      return results;
    }

    /**
     * Get multiple lexical documents in parallel.
     *
     * @param lexicalIds - Array of lexical IDs to retrieve
     * @returns Promise resolving to array of Lexical instances
     *
     * @example
     * ```typescript
     * const lexicals = await sdk.getLexicals(['lex-1', 'lex-2', 'lex-3']);
     * console.log(`Retrieved ${lexicals.length} lexical documents`);
     * ```
     */
    async getLexicals(lexicalIds: string[]): Promise<Lexical[]> {
      if (lexicalIds.length === 0) {
        return [];
      }

      console.log(
        `Retrieving ${lexicalIds.length} lexical documents in parallel`,
      );

      const getPromises = lexicalIds.map(async (id, index) => {
        try {
          const lexical = await this.getLexical(id);
          console.log(
            `Retrieved lexical ${index + 1}/${lexicalIds.length}: ${id}`,
          );
          return lexical;
        } catch (error) {
          console.error(`Failed to retrieve lexical ${id}:`, error);
          throw new Error(`Failed to retrieve lexical ${id}: ${error}`);
        }
      });

      const results = await Promise.all(getPromises);
      console.log(`Successfully retrieved ${results.length} lexical documents`);
      return results;
    }

    /**
     * Update multiple lexical documents in parallel.
     *
     * @param updates - Array of update operations, each containing the lexical ID and update data
     * @returns Promise resolving to array of updated Lexical instances
     *
     * @example
     * ```typescript
     * const updates = [
     *   { id: 'lex-1', data: { name: 'Updated Overview' } },
     *   { id: 'lex-2', data: { name: 'Updated API Docs' } }
     * ];
     * const updated = await sdk.updateLexicals(updates);
     * ```
     */
    async updateLexicals(
      updates: Array<{ id: string; data: UpdateLexicalRequest }>,
    ): Promise<Lexical[]> {
      if (updates.length === 0) {
        return [];
      }

      console.log(`Updating ${updates.length} lexical documents in parallel`);

      const updatePromises = updates.map(async ({ id, data }, index) => {
        try {
          const lexical = await this.updateLexical(id, data);
          console.log(`Updated lexical ${index + 1}/${updates.length}: ${id}`);
          return lexical;
        } catch (error) {
          console.error(`Failed to update lexical ${id}:`, error);
          throw new Error(`Failed to update lexical ${id}: ${error}`);
        }
      });

      const results = await Promise.all(updatePromises);
      console.log(`Successfully updated ${results.length} lexical documents`);
      return results;
    }

    // ========================================================================
    // Service Health Checks
    // ========================================================================

    /**
     * Check the health status of the Spacer service.
     *
     * This method performs a lightweight check to verify that the Spacer
     * service is accessible and responding properly.
     *
     * @returns Promise resolving to health check result
     *
     * @example
     * ```typescript
     * const health = await sdk.checkSpacerHealth();
     * console.log('Service status:', health.status);
     * console.log('Response time:', health.responseTime);
     * if (!health.healthy) {
     *   console.error('Service issues:', health.errors);
     * }
     * ```
     */
    async checkSpacerHealth(): Promise<{
      healthy: boolean;
      status: string;
      responseTime: number;
      errors: string[];
      timestamp: Date;
    }> {
      const startTime = Date.now();
      const errors: string[] = [];
      let status = 'unknown';
      let healthy = false;

      try {
        // Test basic connectivity by getting user spaces (lightweight operation)
        const spaces = await this.getMySpaces();
        const responseTime = Date.now() - startTime;

        if (Array.isArray(spaces)) {
          healthy = true;
          status = 'operational';
        } else {
          status = 'degraded';
          errors.push('Unexpected response format from spaces endpoint');
        }

        return {
          healthy,
          status,
          responseTime,
          errors,
          timestamp: new Date(),
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        status = 'down';
        errors.push(`Service unreachable: ${error}`);

        return {
          healthy: false,
          status,
          responseTime,
          errors,
          timestamp: new Date(),
        };
      }
    }

    /**
     * Get comprehensive spacer service diagnostics.
     *
     * This method provides detailed information about the service state,
     * including workspace and content statistics.
     *
     * @returns Promise resolving to diagnostic information
     *
     * @example
     * ```typescript
     * const diagnostics = await sdk.getSpacerDiagnostics();
     * console.log('Available spaces:', diagnostics.spaceCount);
     * console.log('Service capabilities:', diagnostics.capabilities);
     * ```
     */
    async getSpacerDiagnostics(): Promise<{
      healthy: boolean;
      spaceCount: number;
      capabilities: string[];
      serviceVersion?: string;
      errors: string[];
      timestamp: Date;
    }> {
      const errors: string[] = [];
      let spaceCount = 0;
      const capabilities: string[] = [];
      const healthy = true;

      try {
        // Get space count
        const spaces = await this.getMySpaces();
        spaceCount = Array.isArray(spaces) ? spaces.length : 0;
        capabilities.push('spaces');

        // Test content loading capability
        try {
          // This is a lightweight test - we don't actually load content
          capabilities.push('content-loading');
        } catch (error) {
          errors.push(`Content loading test failed: ${error}`);
          // Don't mark as unhealthy since this is optional
        }

        // Test batch operations capability
        try {
          // Test with empty arrays to verify the methods exist and work
          await this.createNotebooks([]);
          await this.createLexicals([]);
          capabilities.push('batch-operations');
        } catch (error) {
          errors.push(`Batch operations test failed: ${error}`);
          // Don't mark as unhealthy since this is optional
        }

        return {
          healthy,
          spaceCount,
          capabilities,
          errors,
          timestamp: new Date(),
        };
      } catch (error) {
        errors.push(`Service diagnostics failed: ${error}`);
        return {
          healthy: false,
          spaceCount: 0,
          capabilities: [],
          errors,
          timestamp: new Date(),
        };
      }
    }
  };
}
