/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/Lexical
 * @description Lexical domain model for the Datalayer SDK.
 *
 * This model provides a rich, object-oriented interface for working with
 * Lexical documents, including content management and lifecycle operations.
 */

import type {
  Lexical as LexicalData,
  UpdateLexicalRequest,
} from '../../../api/types/spacer';
import { lexicals } from '../../../api/spacer';
import { items } from '../../../api/spacer';
import type { DatalayerSDK } from '../index';

/**
 * Lexical domain model that wraps API responses with convenient methods.
 *
 * Provides a rich, object-oriented interface for managing Lexical documents
 * with automatic data refresh and lifecycle operations.
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('spaceId', 'space-123');
 * formData.append('name', 'Project Documentation');
 * const lexical = await sdk.createLexical(formData);
 *
 * // Static properties - instant access
 * console.log(lexical.id);
 * console.log(lexical.spaceId);
 *
 * // Dynamic data - always fresh from API
 * const currentName = await lexical.getName();
 * const content = await lexical.getContent();
 *
 * // Update document
 * const updated = await lexical.update({ name: 'Updated Documentation' });
 * ```
 */
export class Lexical {
  protected _data: LexicalData;
  private _sdk: DatalayerSDK;
  private _deleted: boolean = false;
  private _freshData: LexicalData | null = null;
  private _lastFetch: number = 0;
  private _cacheTimeout = 5000; // 5 seconds cache timeout

  /**
   * Create a Lexical instance.
   *
   * @param data - Raw lexical data from API
   * @param sdk - DatalayerSDK instance for making API calls
   */
  constructor(data: LexicalData, sdk: DatalayerSDK) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Deletion State
  // ========================================================================

  /**
   * Check if this lexical document has been deleted.
   */
  get isDeleted(): boolean {
    return this._deleted;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if this lexical document has been deleted and throw error if so.
   * @throws Error if the document has been deleted
   */
  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Lexical ${this._data.id} has been deleted and no longer exists`,
      );
    }
  }

  /**
   * Get fresh data from API with caching to avoid redundant calls.
   * @returns Current LexicalData from API or cache
   */
  private async _getFreshData(): Promise<LexicalData> {
    this._checkDeleted();

    const now = Date.now();
    if (this._freshData && now - this._lastFetch < this._cacheTimeout) {
      // Return cached data if recent enough
      return this._freshData;
    }

    // Fetch fresh data from API
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await lexicals.getLexical(token, this.uid, spacerRunUrl);

    if (response.document) {
      this._freshData = response.document;
      this._data = response.document; // Keep internal data up to date
      this._lastFetch = now;
      return this._freshData;
    }

    return this._data; // Fallback to existing data
  }

  // ========================================================================
  // Static Properties (set at creation, never change)
  // ========================================================================

  /**
   * Lexical document ID.
   */
  get id(): string {
    this._checkDeleted();
    return this._data.id;
  }

  /**
   * Unique identifier for the document.
   */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
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

    // Extract from s3_path_s if available: "datalayer.app/SPACE_ID/documents/..."
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
    return this._data.owner_id || this._data.creator_uid || '';
  }

  /**
   * When the document was created.
   */
  get createdAt(): Date {
    this._checkDeleted();
    const dateStr = this._data.creation_ts_dt || this._data.created_at;
    if (!dateStr) {
      throw new Error('No creation timestamp available for lexical document');
    }
    return new Date(dateStr);
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current name of the document.
   *
   * This method fetches fresh data from the API (with caching) and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current document name
   * @throws Error if the document has been deleted
   */
  async getName(): Promise<string> {
    const freshData = await this._getFreshData();
    return freshData.name_t || freshData.name || '';
  }

  /**
   * Get the document content.
   *
   * @returns Promise resolving to document content
   */
  async getContent(): Promise<any> {
    const freshData = await this._getFreshData();
    // Try to parse model_s if content is not available
    if (!freshData.content && freshData.model_s) {
      try {
        return JSON.parse(freshData.model_s);
      } catch {
        // Fall back to raw model_s if parsing fails
        return freshData.model_s;
      }
    }
    return freshData.content;
  }

  /**
   * Get when the document was last updated.
   *
   * @returns Promise resolving to last update time
   */
  async getUpdatedAt(): Promise<Date> {
    const freshData = await this._getFreshData();
    const dateStr =
      freshData.last_update_ts_dt ||
      freshData.updated_at ||
      freshData.creation_ts_dt ||
      freshData.created_at;
    if (!dateStr) {
      throw new Error('No timestamp available for lexical document');
    }
    return new Date(dateStr);
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Update the document name and/or description.
   *
   * @param data - Update data containing name and/or description
   * @returns Promise resolving to updated Lexical instance
   *
   * @example
   * ```typescript
   * const updated = await lexical.update({
   *   name: 'Updated Documentation',
   *   description: 'Updated document description'
   * });
   * ```
   */
  async update(data: UpdateLexicalRequest): Promise<Lexical> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await lexicals.updateLexical(
      token,
      this.uid,
      data,
      spacerRunUrl,
    );
    return new Lexical(response.document, this._sdk);
  }

  /**
   * Delete this document permanently.
   *
   * After deletion, this object will be marked as deleted and subsequent
   * calls to dynamic methods will throw errors.
   *
   * @example
   * ```typescript
   * await lexical.delete();
   * console.log('Document deleted');
   * // lexical.getName() will now throw an error
   * ```
   */
  async delete(): Promise<void> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    await items.deleteItem(token, this.uid, spacerRunUrl);
    this._deleted = true;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw document data object with latest information.
   *
   * This method ensures the returned data includes the most recent information
   * by refreshing from the API before returning.
   *
   * @returns Promise resolving to raw document data
   *
   * @example
   * ```typescript
   * const latestData = await lexical.toJSON();
   * console.log('Current name:', latestData.name);
   * ```
   */
  async toJSON(): Promise<LexicalData> {
    this._checkDeleted();
    await this.getName(); // This updates internal data
    return this._data;
  }

  /**
   * String representation of the document.
   *
   * @returns String representation for logging/debugging
   */
  toString(): string {
    this._checkDeleted();
    const name = this._data.name_t || this._data.name || 'Unnamed';
    return `Lexical(${this.id}, ${name})`;
  }
}

// Re-export the LexicalData type for convenience
export type { LexicalData };
