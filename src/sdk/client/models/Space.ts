/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/Space
 * @description Space domain model for the Datalayer SDK.
 *
 * This model provides a rich, object-oriented interface for working with
 * workspace spaces, including item management and content creation.
 */

import type {
  Space as SpaceData,
  SpaceItem,
  GetSpaceItemsResponse,
} from '../../../api/types/spacer';
import { users, items } from '../../../api/spacer';
import type { DatalayerSDK } from '../index';
import { Notebook } from './Notebook';
import { Lexical } from './Lexical';

/**
 * Space domain model that wraps API responses with convenient methods.
 *
 * Provides a rich, object-oriented interface for managing workspace spaces
 * with automatic data refresh and content creation operations.
 *
 * @example
 * ```typescript
 * const spaces = await sdk.getMySpaces();
 * const space = spaces[0];
 *
 * // Static properties - instant access
 * console.log(space.uid);
 * console.log(space.visibility);
 *
 * // Dynamic data - always fresh from API
 * const currentName = await space.getName();
 * const items = await space.getItems();
 *
 * // Create content in this space
 * const notebook = await space.createNotebook(formData);
 * const lexical = await space.createLexical(formData);
 * ```
 */
export class Space {
  protected _data: SpaceData;
  private _sdk: DatalayerSDK;
  private _deleted: boolean = false;

  /**
   * Create a Space instance.
   *
   * @param data - Raw space data from API
   * @param sdk - DatalayerSDK instance for making API calls
   */
  constructor(data: SpaceData, sdk: DatalayerSDK) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Check if this space has been deleted and throw error if so.
   * @throws Error if the space has been deleted
   */
  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Space ${this._data.uid} has been deleted and no longer exists`,
      );
    }
  }

  /**
   * Refresh space data from the API by fetching user's spaces.
   * Since there's no individual GET endpoint, we fetch from the list.
   */
  private async _refreshData(): Promise<void> {
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response = await users.getMySpaces(token, spacerRunUrl);

    const freshSpace = response.spaces.find(s => s.uid === this.uid);
    if (freshSpace) {
      this._data = freshSpace;
    }
  }

  // ========================================================================
  // Static Properties (set at creation, never change)
  // ========================================================================

  /**
   * Unique identifier for the space.
   */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /**
   * Space ID (optional for backward compatibility).
   */
  get id(): string {
    this._checkDeleted();
    return this._data.id || this._data.uid;
  }

  /**
   * Owner user ID.
   */
  get ownerId(): string {
    this._checkDeleted();
    return this._data.owner_id || '';
  }

  /**
   * Organization ID.
   */
  get organizationId(): string {
    this._checkDeleted();
    return this._data.organization_id || '';
  }

  /**
   * When the space was created.
   */
  get createdAt(): Date {
    this._checkDeleted();
    const dateStr = this._data.created_at;
    if (!dateStr) {
      return new Date(); // Return current date if no date available
    }
    return new Date(dateStr);
  }

  /**
   * Space visibility setting.
   */
  get visibility(): string {
    this._checkDeleted();
    return this._data.visibility || 'private';
  }

  /**
   * URL-friendly handle for the space.
   */
  get handle(): string {
    this._checkDeleted();
    return this._data.handle_s || '';
  }

  /**
   * Space variant type.
   */
  get variant(): string {
    this._checkDeleted();
    return this._data.variant_s || '';
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current name of the space.
   *
   * This method always fetches fresh data from the API and updates
   * the internal data to keep everything in sync.
   *
   * @returns Promise resolving to current space name
   * @throws Error if the space has been deleted
   */
  async getName(): Promise<string> {
    this._checkDeleted();
    await this._refreshData();
    return this._data.name || this._data.name_t || '';
  }

  /**
   * Get the current description of the space.
   *
   * @returns Promise resolving to space description
   */
  async getDescription(): Promise<string> {
    this._checkDeleted();
    await this._refreshData();
    return this._data.description || this._data.description_t || '';
  }

  /**
   * Get when the space was last updated.
   *
   * @returns Promise resolving to last update time
   */
  async getUpdatedAt(): Promise<Date> {
    this._checkDeleted();
    await this._refreshData();
    const dateStr = this._data.updated_at || this._data.created_at;
    if (!dateStr) {
      return new Date(); // Return current date if no date available
    }
    return new Date(dateStr);
  }

  // ========================================================================
  // Space-specific Methods
  // ========================================================================

  /**
   * Get all items in this space.
   *
   * @returns Promise resolving to array of space items
   *
   * @example
   * ```typescript
   * const items = await space.getItems();
   * items.forEach(item => {
   *   console.log(`${item.name} (${item.type})`);
   * });
   * ```
   */
  async getItems(): Promise<SpaceItem[]> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response: GetSpaceItemsResponse = await items.getSpaceItems(
      spacerRunUrl,
      token,
      this.uid,
    );
    return response.items;
  }

  /**
   * Create a new notebook in this space.
   *
   * @param formData - Notebook creation form data
   * @returns Promise resolving to created Notebook instance
   *
   * @example
   * ```typescript
   * const formData = new FormData();
   * formData.append('name', 'Analysis Notebook');
   * formData.append('notebookType', 'jupyter');
   *
   * const notebook = await space.createNotebook(formData);
   * console.log('Created:', notebook.name);
   * ```
   */
  async createNotebook(formData: FormData): Promise<Notebook> {
    this._checkDeleted();

    // Ensure spaceId is set in the form data
    formData.set('spaceId', this.uid);

    return await (this._sdk as any).createNotebook(formData);
  }

  /**
   * Create a new lexical document in this space.
   *
   * @param formData - Lexical creation form data
   * @returns Promise resolving to created Lexical instance
   *
   * @example
   * ```typescript
   * const formData = new FormData();
   * formData.append('name', 'Project Documentation');
   * formData.append('documentType', 'lexical');
   *
   * const lexical = await space.createLexical(formData);
   * console.log('Created:', lexical.name);
   * ```
   */
  async createLexical(formData: FormData): Promise<Lexical> {
    this._checkDeleted();

    // Ensure spaceId is set in the form data
    formData.set('spaceId', this.uid);

    return await (this._sdk as any).createLexical(formData);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw space data object with latest information.
   *
   * This method ensures the returned data includes the most recent information
   * by refreshing from the API before returning.
   *
   * @returns Promise resolving to raw space data
   *
   * @example
   * ```typescript
   * const latestData = await space.toJSON();
   * console.log('Current name:', latestData.name);
   * ```
   */
  async toJSON(): Promise<SpaceData> {
    this._checkDeleted();
    await this._refreshData();
    return this._data;
  }

  /**
   * String representation of the space.
   *
   * @returns String representation for logging/debugging
   */
  toString(): string {
    this._checkDeleted();
    const name = this._data.name || this._data.name_t || 'Unnamed';
    return `Space(${this.uid}, ${name})`;
  }
}

// Re-export the SpaceData type for convenience
export type { SpaceData };
