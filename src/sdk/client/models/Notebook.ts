/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/Notebook
 * @description Notebook domain model for the Datalayer SDK.
 *
 * This model provides a rich, object-oriented interface for working with
 * Jupyter notebooks, including content management and lifecycle operations.
 */

import type {
  Notebook as NotebookData,
  UpdateNotebookRequest,
} from '../../../api/types/spacer';
import { notebooks } from '../../../api/spacer';
import { items } from '../../../api/spacer';
import type { DatalayerSDK } from '../index';

/**
 * Notebook domain model that wraps API responses with convenient methods.
 *
 * Provides a rich, object-oriented interface for managing Jupyter notebooks
 * with automatic data refresh and lifecycle operations.
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('spaceId', 'space-123');
 * formData.append('name', 'Data Analysis');
 * const notebook = await sdk.createNotebook(formData);
 *
 * // Static properties - instant access
 * console.log(notebook.id);
 * console.log(notebook.spaceId);
 *
 * // Dynamic data - always fresh from API
 * const currentName = await notebook.getName();
 * const content = await notebook.getContent();
 *
 * // Update notebook
 * const updated = await notebook.update({ name: 'New Analysis' });
 * ```
 */
export class Notebook {
  protected _data: NotebookData;
  private _sdk: DatalayerSDK;
  private _deleted: boolean = false;
  private _freshData: NotebookData | null = null;
  private _lastFetch: number = 0;
  private _cacheTimeout = 5000; // 5 seconds cache timeout

  /**
   * Create a Notebook instance.
   *
   * @param data - Raw notebook data from API
   * @param sdk - DatalayerSDK instance for making API calls
   */
  constructor(data: NotebookData, sdk: DatalayerSDK) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Deletion State
  // ========================================================================

  /**
   * Check if this notebook has been deleted.
   */
  get isDeleted(): boolean {
    return this._deleted;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if this notebook has been deleted and throw error if so.
   * @throws Error if the notebook has been deleted
   */
  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Notebook ${this._data.id} has been deleted and no longer exists`,
      );
    }
  }

  /**
   * Get fresh data from API with caching to avoid redundant calls.
   * @returns Current NotebookData from API or cache
   */
  private async _getFreshData(): Promise<NotebookData> {
    this._checkDeleted();

    const now = Date.now();
    if (this._freshData && now - this._lastFetch < this._cacheTimeout) {
      // Return cached data if recent enough
      return this._freshData;
    }

    // Fetch fresh data from API
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await notebooks.getNotebook(spacerRunUrl, token, this.uid);

    if (response.notebook) {
      this._freshData = response.notebook;
      this._data = response.notebook; // Keep internal data up to date
      this._lastFetch = now;
      return this._freshData;
    }

    return this._data; // Fallback to existing data
  }

  // ========================================================================
  // Static Properties (set at creation, never change)
  // ========================================================================

  /**
   * Notebook ID.
   */
  get id(): string {
    this._checkDeleted();
    return this._data.id;
  }

  /**
   * Unique identifier for the notebook.
   */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /**
   * File path within the space.
   */
  get path(): string {
    this._checkDeleted();
    return this._data.path;
  }

  /**
   * Parent space ID.
   */
  get spaceId(): string {
    this._checkDeleted();

    // Try the direct field first (if API provides it)
    if (this._data.space_id) {
      return this._data.space_id;
    }

    // Extract from s3_path_s if available: "datalayer.app/SPACE_ID/nbformat/..."
    const s3Path = (this._data as any).s3_path_s;
    if (s3Path && typeof s3Path === 'string') {
      const match = s3Path.match(/^datalayer\.app\/([^/]+)\//);
      if (match) {
        return match[1];
      }
    }

    // Fallback to empty string if no space ID can be determined
    return '';
  }

  /**
   * Owner user ID.
   */
  get ownerId(): string {
    this._checkDeleted();
    return this._data.owner_id;
  }

  /**
   * When the notebook was created.
   */
  get createdAt(): Date {
    this._checkDeleted();
    return new Date(this._data.created_at);
  }

  /**
   * Version number.
   */
  get version(): number {
    this._checkDeleted();
    return this._data.version || 0;
  }

  /**
   * Notebook metadata.
   */
  get metadata(): Record<string, any> {
    this._checkDeleted();
    return this._data.metadata || {};
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current name of the notebook.
   *
   * This method fetches fresh data from the API (with caching) and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current notebook name
   * @throws Error if the notebook has been deleted
   */
  async getName(): Promise<string> {
    const freshData = await this._getFreshData();
    return (freshData as any).name_t || '';
  }

  /**
   * Get the notebook content (cells, etc.).
   *
   * @returns Promise resolving to notebook content
   */
  async getContent(): Promise<any> {
    const freshData = await this._getFreshData();
    return freshData.content;
  }

  /**
   * Get the kernel specification.
   *
   * @returns Promise resolving to kernel spec
   */
  async getKernelSpec(): Promise<any> {
    const freshData = await this._getFreshData();
    return freshData.kernel_spec;
  }

  /**
   * Get when the notebook was last updated.
   *
   * @returns Promise resolving to last update time
   */
  async getUpdatedAt(): Promise<Date> {
    const freshData = await this._getFreshData();
    return new Date(freshData.updated_at || freshData.created_at);
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Update the notebook name and/or description.
   *
   * @param data - Update data containing name and/or description
   * @returns Promise resolving to updated Notebook instance
   *
   * @example
   * ```typescript
   * const updated = await notebook.update({
   *   name: 'Advanced Analysis',
   *   description: 'Updated analysis notebook'
   * });
   * ```
   */
  async update(data: UpdateNotebookRequest): Promise<Notebook> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await notebooks.updateNotebook(
      spacerRunUrl,
      token,
      this.uid,
      data,
    );
    return new Notebook(response.notebook, this._sdk);
  }

  /**
   * Delete this notebook permanently.
   *
   * After deletion, this object will be marked as deleted and subsequent
   * calls to dynamic methods will throw errors.
   *
   * @example
   * ```typescript
   * await notebook.delete();
   * console.log('Notebook deleted');
   * // notebook.getName() will now throw an error
   * ```
   */
  async delete(): Promise<void> {
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    await items.deleteItem(spacerRunUrl, token, this.uid);
    this._deleted = true;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw notebook data object with latest information.
   *
   * This method ensures the returned data includes the most recent information
   * by refreshing from the API before returning.
   *
   * @returns Promise resolving to raw notebook data
   *
   * @example
   * ```typescript
   * const latestData = await notebook.toJSON();
   * console.log('Current name:', latestData.name);
   * ```
   */
  async toJSON(): Promise<NotebookData> {
    this._checkDeleted();
    await this.getName(); // This updates internal data
    return this._data;
  }

  /**
   * String representation of the notebook.
   *
   * @returns String representation for logging/debugging
   */
  toString(): string {
    this._checkDeleted();
    const name = (this._data as any).name_t || 'Unnamed';
    return `Notebook(${this.id}, ${name})`;
  }
}

// Re-export the NotebookData type for convenience
export type { NotebookData };
