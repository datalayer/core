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
   * When the document was created.
   */
  get createdAt(): Date {
    this._checkDeleted();
    return new Date(this._data.created_at);
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current name of the document.
   *
   * This method always fetches fresh data from the API and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current document name
   * @throws Error if the document has been deleted
   */
  async getName(): Promise<string> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await lexicals.getLexical(spacerRunUrl, token, this.id);
    if (response.document) {
      this._data = response.document;
    }
    return this._data.name;
  }

  /**
   * Get the document content.
   *
   * @returns Promise resolving to document content
   */
  async getContent(): Promise<any> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await lexicals.getLexical(spacerRunUrl, token, this.id);
    if (response.document) {
      this._data = response.document;
    }
    return this._data.content;
  }

  /**
   * Get when the document was last updated.
   *
   * @returns Promise resolving to last update time
   */
  async getUpdatedAt(): Promise<Date> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await lexicals.getLexical(spacerRunUrl, token, this.id);
    if (response.document) {
      this._data = response.document;
    }
    return new Date(this._data.updated_at || this._data.created_at);
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
      spacerRunUrl,
      token,
      this.id,
      data,
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
    await items.deleteItem(spacerRunUrl, token, this.id);
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
    return `Lexical(${this.id}, ${this._data.name})`;
  }
}

// Re-export the LexicalData type for convenience
export type { LexicalData };
