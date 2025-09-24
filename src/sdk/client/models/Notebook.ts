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
    return this._data.space_id;
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
   * This method always fetches fresh data from the API and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current notebook name
   * @throws Error if the notebook has been deleted
   */
  async getName(): Promise<string> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await notebooks.getNotebook(spacerRunUrl, token, this.id);
    if (response.notebook) {
      this._data = response.notebook;
    }
    return this._data.name;
  }

  /**
   * Get the notebook content (cells, etc.).
   *
   * @returns Promise resolving to notebook content
   */
  async getContent(): Promise<any> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await notebooks.getNotebook(spacerRunUrl, token, this.id);
    if (response.notebook) {
      this._data = response.notebook;
    }
    return this._data.content;
  }

  /**
   * Get the kernel specification.
   *
   * @returns Promise resolving to kernel spec
   */
  async getKernelSpec(): Promise<any> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await notebooks.getNotebook(spacerRunUrl, token, this.id);
    if (response.notebook) {
      this._data = response.notebook;
    }
    return this._data.kernel_spec;
  }

  /**
   * Get when the notebook was last updated.
   *
   * @returns Promise resolving to last update time
   */
  async getUpdatedAt(): Promise<Date> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await notebooks.getNotebook(spacerRunUrl, token, this.id);
    if (response.notebook) {
      this._data = response.notebook;
    }
    return new Date(this._data.updated_at || this._data.created_at);
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
      this.id,
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
    await items.deleteItem(spacerRunUrl, token, this.id);
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
    return `Notebook(${this.id}, ${this._data.name})`;
  }
}

// Re-export the NotebookData type for convenience
export type { NotebookData };
