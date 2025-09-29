/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Spacer state management with caching and persistence.
 * @module client/state/SpacerState
 */

import {
  PlatformStorage,
  StorageKeys,
  parseStoredData,
  stringifyForStorage,
} from '../storage';

/** Space visibility options. */
export enum SpaceVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
}

/** Stored space data structure. */
export interface StoredSpace {
  id: string;
  uid: string;
  name?: string;
  description?: string;
  variant?: string;
  space_handle?: string;
  organization_id?: string;
  visibility?: SpaceVisibility;
  created_at?: string;
  updated_at?: string;
  // Metadata
  cached_at?: number;
  item_count?: number;
}

/** Stored notebook data structure. */
export interface StoredNotebook {
  id: string;
  uid: string;
  space_id: string;
  name?: string;
  description?: string;
  notebook_type?: string;
  kernel_name?: string;
  created_at?: string;
  updated_at?: string;
  // Content metadata
  size_bytes?: number;
  last_executed?: string;
  // Cache metadata
  cached_at?: number;
  content_cached?: boolean;
}

/** Stored lexical document data structure. */
export interface StoredLexical {
  id: string;
  uid: string;
  space_id: string;
  name?: string;
  description?: string;
  document_type?: string;
  created_at?: string;
  updated_at?: string;
  // Content metadata
  word_count?: number;
  size_bytes?: number;
  // Cache metadata
  cached_at?: number;
  content_cached?: boolean;
}

/** Notebook content cache. */
export interface CachedNotebookContent {
  notebook_id: string;
  content: any; // Jupyter notebook JSON
  cached_at: number;
  etag?: string;
}

/**
 * Lexical content cache.
 */
export interface CachedLexicalContent {
  lexical_id: string;
  content: any; // Lexical editor state
  cached_at: number;
  etag?: string;
}

/**
 * Spacer state manager for workspace and content.
 */
export class SpacerState {
  constructor(private storage: PlatformStorage) {}

  // ========================================================================
  // Space Management
  // ========================================================================

  /**
   * Get all cached spaces.
   *
   * @returns Array of cached spaces
   */
  async getCachedSpaces(): Promise<StoredSpace[]> {
    const data = await this.storage.get('spaces_list');
    if (!data) return [];

    const cached = parseStoredData<{
      spaces: StoredSpace[];
      cached_at: number;
    }>(data);

    if (!cached) return [];

    // Check if cache is expired (30 minutes)
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    if (now - cached.cached_at > maxAge) {
      await this.storage.remove('spaces_list');
      return [];
    }

    return cached.spaces;
  }

  /**
   * Cache spaces list.
   *
   * @param spaces Spaces to cache
   */
  async cacheSpaces(spaces: StoredSpace[]): Promise<void> {
    const cacheData = {
      spaces,
      cached_at: Date.now(),
    };
    await this.storage.set('spaces_list', stringifyForStorage(cacheData));
  }

  /**
   * Get a specific cached space.
   *
   * @param spaceId Space ID
   * @returns Space data or null
   */
  async getCachedSpace(spaceId: string): Promise<StoredSpace | null> {
    const key = `${StorageKeys.SPACE_PREFIX}${spaceId}`;
    const data = await this.storage.get(key);
    return parseStoredData<StoredSpace>(data);
  }

  /**
   * Cache space data.
   *
   * @param space Space data to cache
   */
  async cacheSpace(space: StoredSpace): Promise<void> {
    const key = `${StorageKeys.SPACE_PREFIX}${space.id}`;
    const dataToCache = {
      ...space,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(dataToCache));

    // Also update the spaces list if it exists
    const spaces = await this.getCachedSpaces();
    const index = spaces.findIndex(s => s.id === space.id);
    if (index >= 0) {
      spaces[index] = dataToCache;
      await this.cacheSpaces(spaces);
    }
  }

  /**
   * Remove cached space.
   *
   * @param spaceId Space ID
   */
  async removeCachedSpace(spaceId: string): Promise<void> {
    const key = `${StorageKeys.SPACE_PREFIX}${spaceId}`;
    await this.storage.remove(key);

    // Also remove from spaces list
    const spaces = await this.getCachedSpaces();
    const filtered = spaces.filter(s => s.id !== spaceId);
    if (filtered.length !== spaces.length) {
      await this.cacheSpaces(filtered);
    }
  }

  // ========================================================================
  // Notebook Management
  // ========================================================================

  /**
   * Get cached notebooks for a space.
   *
   * @param spaceId Optional space ID filter
   * @returns Array of cached notebooks
   */
  async getCachedNotebooks(spaceId?: string): Promise<StoredNotebook[]> {
    const key = spaceId ? `notebooks:${spaceId}` : 'notebooks:all';
    const data = await this.storage.get(key);
    if (!data) return [];

    const cached = parseStoredData<{
      notebooks: StoredNotebook[];
      cached_at: number;
    }>(data);

    if (!cached) return [];

    // Check if cache is expired (10 minutes)
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (now - cached.cached_at > maxAge) {
      await this.storage.remove(key);
      return [];
    }

    return cached.notebooks;
  }

  /**
   * Cache notebooks list.
   *
   * @param notebooks Notebooks to cache
   * @param spaceId Optional space ID for scoped caching
   */
  async cacheNotebooks(
    notebooks: StoredNotebook[],
    spaceId?: string,
  ): Promise<void> {
    const key = spaceId ? `notebooks:${spaceId}` : 'notebooks:all';
    const cacheData = {
      notebooks,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(cacheData));
  }

  /**
   * Get a specific cached notebook.
   *
   * @param notebookId Notebook ID
   * @returns Notebook data or null
   */
  async getCachedNotebook(notebookId: string): Promise<StoredNotebook | null> {
    const key = `${StorageKeys.NOTEBOOK_PREFIX}${notebookId}`;
    const data = await this.storage.get(key);
    return parseStoredData<StoredNotebook>(data);
  }

  /**
   * Cache notebook data.
   *
   * @param notebook Notebook data to cache
   */
  async cacheNotebook(notebook: StoredNotebook): Promise<void> {
    const key = `${StorageKeys.NOTEBOOK_PREFIX}${notebook.id}`;
    const dataToCache = {
      ...notebook,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(dataToCache));
  }

  /**
   * Get cached notebook content.
   *
   * @param notebookId Notebook ID
   * @returns Notebook content or null
   */
  async getCachedNotebookContent(
    notebookId: string,
  ): Promise<CachedNotebookContent | null> {
    const key = `notebook_content:${notebookId}`;
    const data = await this.storage.get(key);
    if (!data) return null;

    const cached = parseStoredData<CachedNotebookContent>(data);
    if (!cached) return null;

    // Check if cache is expired (5 minutes for content)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (now - cached.cached_at > maxAge) {
      await this.storage.remove(key);
      return null;
    }

    return cached;
  }

  /**
   * Cache notebook content.
   *
   * @param notebookId Notebook ID
   * @param content Notebook content
   * @param etag Optional ETag for versioning
   */
  async cacheNotebookContent(
    notebookId: string,
    content: any,
    etag?: string,
  ): Promise<void> {
    const key = `notebook_content:${notebookId}`;
    const cacheData: CachedNotebookContent = {
      notebook_id: notebookId,
      content,
      cached_at: Date.now(),
      etag,
    };
    await this.storage.set(key, stringifyForStorage(cacheData));

    // Update notebook metadata to indicate content is cached
    const notebook = await this.getCachedNotebook(notebookId);
    if (notebook) {
      notebook.content_cached = true;
      await this.cacheNotebook(notebook);
    }
  }

  // ========================================================================
  // Lexical Document Management
  // ========================================================================

  /**
   * Get cached lexical documents for a space.
   *
   * @param spaceId Optional space ID filter
   * @returns Array of cached lexical documents
   */
  async getCachedLexicals(spaceId?: string): Promise<StoredLexical[]> {
    const key = spaceId ? `lexicals:${spaceId}` : 'lexicals:all';
    const data = await this.storage.get(key);
    if (!data) return [];

    const cached = parseStoredData<{
      lexicals: StoredLexical[];
      cached_at: number;
    }>(data);

    if (!cached) return [];

    // Check if cache is expired (10 minutes)
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (now - cached.cached_at > maxAge) {
      await this.storage.remove(key);
      return [];
    }

    return cached.lexicals;
  }

  /**
   * Cache lexical documents list.
   *
   * @param lexicals Lexical documents to cache
   * @param spaceId Optional space ID for scoped caching
   */
  async cacheLexicals(
    lexicals: StoredLexical[],
    spaceId?: string,
  ): Promise<void> {
    const key = spaceId ? `lexicals:${spaceId}` : 'lexicals:all';
    const cacheData = {
      lexicals,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(cacheData));
  }

  /**
   * Get a specific cached lexical document.
   *
   * @param lexicalId Lexical document ID
   * @returns Lexical data or null
   */
  async getCachedLexical(lexicalId: string): Promise<StoredLexical | null> {
    const key = `${StorageKeys.LEXICAL_PREFIX}${lexicalId}`;
    const data = await this.storage.get(key);
    return parseStoredData<StoredLexical>(data);
  }

  /**
   * Cache lexical document data.
   *
   * @param lexical Lexical document data to cache
   */
  async cacheLexical(lexical: StoredLexical): Promise<void> {
    const key = `${StorageKeys.LEXICAL_PREFIX}${lexical.id}`;
    const dataToCache = {
      ...lexical,
      cached_at: Date.now(),
    };
    await this.storage.set(key, stringifyForStorage(dataToCache));
  }

  // ========================================================================
  // Service URLs
  // ========================================================================

  /**
   * Get stored Spacer service URL.
   */
  async getSpacerUrl(): Promise<string | null> {
    return await this.storage.get(StorageKeys.SPACER_URL);
  }

  /**
   * Store Spacer service URL.
   */
  async setSpacerUrl(url: string): Promise<void> {
    await this.storage.set(StorageKeys.SPACER_URL, url);
  }

  // ========================================================================
  // Recent Items
  // ========================================================================

  /**
   * Get recently accessed items.
   *
   * @returns Recent items with timestamps
   */
  async getRecentItems(): Promise<
    Array<{
      type: 'space' | 'notebook' | 'lexical';
      id: string;
      name?: string;
      accessed_at: number;
    }>
  > {
    const data = await this.storage.get('recent_items');
    if (!data) return [];

    const recent = parseStoredData<any[]>(data);
    return recent || [];
  }

  /**
   * Add item to recent list.
   *
   * @param type Item type
   * @param id Item ID
   * @param name Optional item name
   */
  async addRecentItem(
    type: 'space' | 'notebook' | 'lexical',
    id: string,
    name?: string,
  ): Promise<void> {
    const recent = await this.getRecentItems();

    // Remove if already exists
    const filtered = recent.filter(item => item.id !== id);

    // Add to front
    filtered.unshift({
      type,
      id,
      name,
      accessed_at: Date.now(),
    });

    // Keep only last 20 items
    const trimmed = filtered.slice(0, 20);

    await this.storage.set('recent_items', stringifyForStorage(trimmed));
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Clear all spacer-related state.
   */
  async clear(): Promise<void> {
    // Clear lists
    await this.storage.remove('spaces_list');
    await this.storage.remove('recent_items');

    // Would need to iterate and clear all individual items
    // In production, we'd track these keys
  }

  /**
   * Get spacer statistics.
   *
   * @returns Statistics about cached content
   */
  async getStatistics(): Promise<{
    totalSpaces: number;
    totalNotebooks: number;
    totalLexicals: number;
    recentCount: number;
  }> {
    const spaces = await this.getCachedSpaces();
    const notebooks = await this.getCachedNotebooks();
    const lexicals = await this.getCachedLexicals();
    const recent = await this.getRecentItems();

    return {
      totalSpaces: spaces.length,
      totalNotebooks: notebooks.length,
      totalLexicals: lexicals.length,
      recentCount: recent.length,
    };
  }
}
