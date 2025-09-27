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
  GetSpaceItemsResponse,
} from '../../../api/types/spacer';
import * as users from '../../../api/spacer/users';
import * as items from '../../../api/spacer/items';
import type { DatalayerSDK } from '../index';
import { Notebook } from './Notebook';
import { Lexical } from './Lexical';
import { Cell } from './Cell';

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
   * Note: May not be available for all spaces depending on API response.
   */
  get createdAt(): Date | null {
    this._checkDeleted();
    const dateStr = (this._data as any).creation_ts_dt || this._data.created_at;
    if (!dateStr) {
      return null; // Some spaces don't have timestamps
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
   * Get the cached name of the space (synchronous).
   *
   * Returns the name from cached data without making an API call.
   *
   * @returns Cached space name
   */
  get name(): string {
    this._checkDeleted();
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
   * Get the cached description of the space (synchronous).
   *
   * Returns the description from cached data without making an API call.
   *
   * @returns Cached space description
   */
  get description(): string {
    this._checkDeleted();
    return this._data.description || this._data.description_t || '';
  }

  /**
   * Get when the space was last updated.
   *
   * @returns Promise resolving to last update time
   */
  async getUpdatedAt(): Promise<Date | null> {
    this._checkDeleted();
    await this._refreshData();
    const dateStr =
      (this._data as any).last_update_ts_dt ||
      this._data.updated_at ||
      (this._data as any).creation_ts_dt ||
      this._data.created_at;
    if (!dateStr) {
      return null; // Some spaces don't have timestamps
    }
    return new Date(dateStr);
  }

  /**
   * Get the cached update time (synchronous).
   *
   * Returns the update time from cached data without making an API call.
   *
   * @returns Cached update time or null
   */
  get updatedAt(): Date | null {
    this._checkDeleted();
    const dateStr =
      (this._data as any).last_update_ts_dt ||
      this._data.updated_at ||
      (this._data as any).creation_ts_dt ||
      this._data.created_at;
    if (!dateStr) {
      return null;
    }
    return new Date(dateStr);
  }

  // ========================================================================
  // Space-specific Methods
  // ========================================================================

  /**
   * Get all items in this space as model instances.
   *
   * @returns Promise resolving to array of Notebook, Lexical, and Cell model instances
   *
   * @example
   * ```typescript
   * const items = await space.getItems();
   * for (const item of items) {
   *   if (item instanceof Notebook) {
   *     console.log('Notebook:', item.name);
   *     const content = await item.getContent();
   *   } else if (item instanceof Lexical) {
   *     console.log('Document:', item.name);
   *     const content = await item.getContent();
   *   } else if (item instanceof Cell) {
   *     console.log('Cell:', item.name, item.cellType);
   *     const content = await item.getContent();
   *   }
   * }
   * ```
   */
  async getItems(): Promise<(Notebook | Lexical | Cell)[]> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();
    const response: GetSpaceItemsResponse = await items.getSpaceItems(
      token,
      this.uid,
      spacerRunUrl,
    );

    // Convert raw items to model instances
    const modelItems: (Notebook | Lexical | Cell)[] = [];
    for (const item of response.items) {
      if (item.type === 'notebook') {
        modelItems.push(new Notebook(item as any, this._sdk));
      } else if (item.type === 'lexical') {
        modelItems.push(new Lexical(item as any, this._sdk));
      } else if (item.type === 'cell') {
        modelItems.push(new Cell(item as any, this._sdk));
      }
      // Skip unknown types
    }

    return modelItems;
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
   * Get raw space data object.
   *
   * Note: This returns the current cached data without refreshing.
   * Use refresh() method if you need to update the data first.
   *
   * @returns Raw space data object
   *
   * @example
   * ```typescript
   * const data = space.toJSON();
   * console.log('Cached name:', data.name);
   * ```
   */
  toJSON(): SpaceData {
    this._checkDeleted();
    // Don't refresh here as this method is called by JSON.stringify
    // and could cause issues with circular references or async operations
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
