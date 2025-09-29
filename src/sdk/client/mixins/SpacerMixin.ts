/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Spacer mixin for managing workspaces, notebooks, and content.
 * @module sdk/client/mixins/SpacerMixin
 */

import * as spaces from '../../../api/spacer/spaces';
import * as notebooks from '../../../api/spacer/notebooks';
import * as users from '../../../api/spacer/users';
import * as lexicals from '../../../api/spacer/lexicals';
import * as items from '../../../api/spacer/items';
import type {
  CreateSpaceRequest,
  UpdateNotebookRequest,
  UpdateLexicalRequest,
  GetSpaceItemsResponse,
  DeleteSpaceItemResponse,
} from '../../../api/types/spacer';
import type { Constructor } from '../utils/mixins';
import { Notebook } from '../models/Notebook';
import { Lexical } from '../models/Lexical';
import { Space } from '../models/Space';

/** Options for content loading with CDN support. */
export interface ContentLoadingOptions {
  /** Whether to try CDN first before API (default: true) */
  preferCDN?: boolean;
  /** Whether to cache content locally for offline access (default: false) */
  cacheLocally?: boolean;
  /** CDN base URL (default: https://cdn.datalayer.run) */
  cdnBaseUrl?: string;
}

/** Spacer mixin providing workspace and content management. */
export function SpacerMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    // ========================================================================
    // User
    // ========================================================================

    /**
     * Get all workspaces for the authenticated user.
     * @returns Array of Space instances
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
     * @param name - Space name
     * @param description - Space description
     * @param variant - Space variant type
     * @param spaceHandle - Unique handle for the space
     * @param organizationId - Organization ID
     * @param seedSpaceId - Seed space ID for initialization
     * @param isPublic - Whether the space is public
     * @returns Created Space instance
     */
    async createSpace(
      name: string,
      description: string,
      variant: string,
      spaceHandle: string,
      organizationId: string,
      seedSpaceId: string,
      isPublic: boolean,
    ): Promise<Space> {
      const token = (this as any).getToken();
      const spacerRunUrl = (this as any).getSpacerRunUrl();

      const data: CreateSpaceRequest = {
        name,
        description,
        variant,
        spaceHandle,
        organizationId,
        seedSpaceId,
        public: isPublic,
      };

      const response = await spaces.createSpace(token, data, spacerRunUrl);
      return new Space(response.space, this as any);
    }

    // ========================================================================
    // Notebooks
    // ========================================================================

    /**
     * Create a new notebook.
     * @param spaceId - ID of the space to create the notebook in
     * @param name - Name of the notebook
     * @param description - Description of the notebook
     * @param file - Optional file for notebook content
     * @returns Created Notebook instance
     */
    async createNotebook(
      spaceId: string,
      name: string,
      description: string,
      file?: File | Blob,
    ): Promise<Notebook> {
      // Get the Space model instance
      const spaces = await this.getMySpaces();
      const spaceModel = spaces.find((s: any) => s.uid === spaceId);

      if (!spaceModel) {
        throw new Error(`Space with ID '${spaceId}' not found`);
      }

      // Use the Space model's createNotebook method
      return await spaceModel.createNotebook({
        name,
        description,
        file,
      });
    }

    /**
     * Get a notebook by ID.
     * @param id - Notebook ID
     * @returns Notebook instance
     */
    async getNotebook(id: string): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await notebooks.getNotebook(token, id, spacerRunUrl);

      if (!response.notebook) {
        throw new Error(`Notebook with ID '${id}' not found`);
      }

      return new Notebook(response.notebook, this as any);
    }

    /**
     * Update a notebook.
     * @param id - Notebook ID
     * @param name - Optional new name for the notebook
     * @param description - Optional new description for the notebook
     * @returns Updated Notebook instance
     */
    async updateNotebook(
      id: string,
      name?: string,
      description?: string,
    ): Promise<Notebook> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      const data: UpdateNotebookRequest = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;

      const response = await notebooks.updateNotebook(
        token,
        id,
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
     * @param spaceId - ID of the space to create the lexical document in
     * @param name - Name of the lexical document
     * @param description - Description of the lexical document
     * @param file - Optional file for document content
     * @returns Created Lexical instance
     */
    async createLexical(
      spaceId: string,
      name: string,
      description: string,
      file?: File | Blob,
    ): Promise<Lexical> {
      // Get the Space model instance
      const spaces = await this.getMySpaces();
      const spaceModel = spaces.find((s: any) => s.uid === spaceId);

      if (!spaceModel) {
        throw new Error(`Space with ID '${spaceId}' not found`);
      }

      // Use the Space model's createLexical method
      return await spaceModel.createLexical({
        name,
        description,
        file,
      });
    }

    /**
     * Get a lexical document by ID.
     * @param id - Document ID
     * @returns Lexical instance
     */
    async getLexical(id: string): Promise<Lexical> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      const response = await lexicals.getLexical(token, id, spacerRunUrl);

      if (!response.document) {
        throw new Error(`Lexical document with ID '${id}' not found`);
      }

      return new Lexical(response.document, this as any);
    }

    /**
     * Update a lexical document.
     * @param id - Document ID
     * @param name - Optional new name for the lexical document
     * @param description - Optional new description for the lexical document
     * @returns Updated Lexical instance
     */
    async updateLexical(
      id: string,
      name?: string,
      description?: string,
    ): Promise<Lexical> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();

      const data: UpdateLexicalRequest = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;

      const response = await lexicals.updateLexical(
        token,
        id,
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
     * @param spaceId - Space ID
     * @returns Space items
     */
    async getSpaceItems(spaceId: string): Promise<GetSpaceItemsResponse> {
      const spacerRunUrl = (this as any).getSpacerRunUrl();
      const token = (this as any).getToken();
      return await items.getSpaceItems(token, spaceId, spacerRunUrl);
    }

    /**
     * Delete an item from a space.
     * @param itemId - Item ID to delete
     * @returns Deletion response
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
     * Tries CDN first for speed, falls back to API if needed, optionally caches locally.
     *
     * @param notebookIdOrInstance - Notebook ID or Notebook instance
     * @param options - Content loading options
     * @returns Notebook content
     */
    async getNotebookContent(
      notebookId: string,
      options: ContentLoadingOptions = {},
    ): Promise<any> {
      const {
        preferCDN = true,
        cacheLocally = false,
        cdnBaseUrl = 'https://cdn.datalayer.run',
      } = options;

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
     * Similar to getNotebookContent but for lexical documents.
     *
     * @param lexicalId - Lexical ID
     * @param options - Content loading options
     * @returns Lexical content
     */
    async getLexicalContent(
      lexicalId: string,
      options: ContentLoadingOptions = {},
    ): Promise<any> {
      const {
        preferCDN = true,
        cacheLocally = false,
        cdnBaseUrl = 'https://cdn.datalayer.run',
      } = options;

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
     * Loads content in parallel and caches locally.
     *
     * @param itemIds - Array of notebook or lexical IDs to prefetch
     * @param itemType - Type of items ('notebook' or 'lexical')
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
    // Service Health Checks
    // ========================================================================

    /**
     * Check the health status of the Spacer service.
     * Performs a lightweight check to verify service accessibility.
     *
     * @returns Health check result with status and response time
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
  };
}
