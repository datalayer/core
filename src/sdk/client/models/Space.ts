/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Space domain model for the Datalayer SDK.
 *
 * @module sdk/client/models/Space
 */

import type {
  Space as SpaceData,
  GetSpaceItemsResponse,
} from '../../../api/types/spacer';
import * as users from '../../../api/spacer/users';
import * as items from '../../../api/spacer/items';
import * as notebooks from '../../../api/spacer/notebooks';
import * as lexicals from '../../../api/spacer/lexicals';
import type { DatalayerSDK } from '../index';
import { Notebook } from './Notebook';
import { Lexical } from './Lexical';
import { ItemTypes } from '../constants';

/**
 * Stable public interface for Space data.
 * This is the contract that SDK consumers can rely on.
 * The raw API may change, but this interface remains stable.
 */
export interface SpaceJSON {
  /** Unique identifier for the space */
  uid: string;
  /** Name of the space */
  name: string;
  /** Description of the space */
  description?: string;
  /** Type of space */
  type?: string;
  /** Number of items in the space */
  itemCount?: number;
  /** ISO 8601 timestamp when the space was created */
  createdAt?: string;
  /** ISO 8601 timestamp when the space was last updated */
  updatedAt?: string;
}

/**
 * Space domain model that wraps API responses with convenient methods.
 * Provides workspace management with data refresh and content creation operations.
 *
 * @example
 * ```typescript
 * const space = spaces[0];
 * const items = await space.getItems();
 * const notebook = await space.createNotebook({ name: 'Analysis' });
 * ```
 */
export class Space {
  protected _data: SpaceData;
  private _sdk: DatalayerSDK;
  private _deleted: boolean = false;

  /**
   * Create a Space instance.
   *
   * @param data - Space data from API
   * @param sdk - SDK instance
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
   * @throws Error if deleted
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

  /** Unique identifier for the space. */
  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  /** Space ID (optional for backward compatibility). */
  get id(): string {
    this._checkDeleted();
    return this._data.id || this._data.uid;
  }

  /** Owner user ID. */
  get ownerId(): string {
    this._checkDeleted();
    return this._data.owner_id || '';
  }

  /** Organization ID. */
  get organizationId(): string {
    this._checkDeleted();
    return this._data.organization_id || '';
  }

  /**
   * When the space was created.
   * May not be available for all spaces.
   */
  get createdAt(): Date | null {
    this._checkDeleted();
    const dateStr = (this._data as any).creation_ts_dt || this._data.created_at;
    if (!dateStr) {
      return null; // Some spaces don't have timestamps
    }
    return new Date(dateStr);
  }

  /** Space visibility setting. */
  get visibility(): string {
    this._checkDeleted();
    return this._data.visibility || 'private';
  }

  /** URL-friendly handle for the space. */
  get handle(): string {
    this._checkDeleted();
    return this._data.handle_s || '';
  }

  /** Space variant type. */
  get variant(): string {
    this._checkDeleted();
    return this._data.variant_s || '';
  }

  /** Space type. */
  get type(): string {
    this._checkDeleted();
    return this._data.type || '';
  }

  // ========================================================================
  // Dynamic Methods (always fetch fresh data and update internal state)
  // ========================================================================

  /**
   * Get the current name of the space.
   * Always fetches fresh data from API.
   *
   * @returns Current space name
   * @throws Error if deleted
   */
  async getName(): Promise<string> {
    this._checkDeleted();
    await this._refreshData();
    return this._data.name || this._data.name_t || '';
  }

  /**
   * The cached name of the space.
   */
  get name(): string {
    this._checkDeleted();
    return this._data.name || this._data.name_t || '';
  }

  /**
   * Get the current description of the space.
   *
   * @returns Space description
   */
  async getDescription(): Promise<string> {
    this._checkDeleted();
    await this._refreshData();
    return this._data.description || this._data.description_t || '';
  }

  /**
   * The cached description of the space.
   */
  get description(): string {
    this._checkDeleted();
    return this._data.description || this._data.description_t || '';
  }

  /**
   * Get when the space was last updated.
   *
   * @returns Last update time
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
   * The cached update time.
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
   * Helper method to create items in this space.
   *
   * @param itemType - Type of item to create
   * @param data - Creation configuration
   * @returns Created model instance
   * @internal
   */
  private async _createItem<T extends Notebook | Lexical>(
    itemType: 'notebook' | 'lexical',
    data: {
      name: string;
      type?: string;
      description?: string;
      file?: File | Blob;
    },
  ): Promise<T> {
    this._checkDeleted();

    // Get necessary configuration from SDK
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();

    // Call API directly to avoid recursion
    if (itemType === 'notebook') {
      const requestData = {
        spaceId: this.uid,
        name: data.name,
        description: data.description || '',
        notebookType: data.type || 'jupyter',
        file: data.file,
      };
      const response = await notebooks.createNotebook(
        token,
        requestData,
        spacerRunUrl,
      );
      return new Notebook(response.notebook, this._sdk) as T;
    } else {
      const requestData = {
        spaceId: this.uid,
        name: data.name,
        description: data.description || '',
        documentType: data.type || 'lexical',
        file: data.file,
      };
      const response = await lexicals.createLexical(
        token,
        requestData,
        spacerRunUrl,
      );
      return new Lexical(response.document, this._sdk) as T;
    }
  }

  /**
   * Get all items in this space as model instances.
   *
   * @returns Array of Notebook and Lexical model instances
   */
  async getItems(): Promise<(Notebook | Lexical)[]> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();

    const response: GetSpaceItemsResponse = await items.getSpaceItems(
      token,
      this.uid,
      spacerRunUrl,
    );

    // Convert raw items to model instances
    const modelItems: (Notebook | Lexical)[] = [];
    for (const item of response.items) {
      // Check various possible type fields
      const itemType: string = (item as any).type_s;

      // Debug logging to understand what types we're getting
      console.log('[SDK Space] Item from API:', {
        name: (item as any).name || (item as any).name_t,
        type: itemType,
        actualTypeValue: itemType,
        isNotebook: itemType === ItemTypes.NOTEBOOK,
        isLexical: itemType === ItemTypes.LEXICAL,
        ItemTypesNOTEBOOK: ItemTypes.NOTEBOOK,
        ItemTypesLEXICAL: ItemTypes.LEXICAL,
        typeEqualsStringNotebook: itemType === 'notebook',
        typeEqualsStringLexical: itemType === 'document',
        hasType: !!item.type_s,
        hasTypeS: !!(item as any).type_s,
        hasItemTypeS: !!(item as any).item_type_s,
      });

      // Only include notebooks and lexicals
      if (itemType === ItemTypes.NOTEBOOK) {
        modelItems.push(new Notebook(item as any, this._sdk));
      } else if (itemType === ItemTypes.LEXICAL) {
        modelItems.push(new Lexical(item as any, this._sdk));
      }
      // Skip everything else (exercises, cells, etc.)
    }

    return modelItems;
  }

  /**
   * Create a new notebook in this space.
   *
   * @param data - Notebook creation configuration
   * @returns Created Notebook instance
   */
  async createNotebook(data: {
    name: string;
    description?: string;
    file?: File | Blob;
  }): Promise<Notebook> {
    return this._createItem('notebook', {
      name: data.name,
      type: ItemTypes.NOTEBOOK,
      description: data.description,
      file: data.file,
    });
  }

  /**
   * Create a new lexical document in this space.
   *
   * @param data - Lexical creation configuration
   * @returns Created Lexical instance
   */
  async createLexical(data: {
    name: string;
    description?: string;
    file?: File | Blob;
  }): Promise<Lexical> {
    return this._createItem('lexical', {
      name: data.name,
      type: ItemTypes.LEXICAL,
      description: data.description,
      file: data.file,
    });
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get raw space data object.
   * Returns cached data without refreshing.
   *
   * @returns Raw space data object
   */
  /**
   * Get space data in camelCase format.
   * Returns only the core fields that consumers need.
   * This provides a stable interface regardless of API changes.
   *
   * @returns Core space data with camelCase properties
   */
  toJSON(): SpaceJSON {
    this._checkDeleted();
    return {
      uid: this._data.uid,
      name: this._data.name || this._data.name_t || '',
      description: this._data.description,
      type: this._data.type || undefined,
      itemCount: (this._data as any).item_count || undefined,
      createdAt: this._data.created_at || (this._data as any).creation_ts_dt,
      updatedAt: this._data.updated_at || (this._data as any).last_update_ts_dt,
    };
  }

  /**
   * Get the raw space data exactly as received from the API.
   * This preserves the original snake_case naming from the API response.
   *
   * @returns Raw space data from API
   */
  rawData(): SpaceData {
    this._checkDeleted();
    return this._data;
  }

  /** String representation of the space. */
  toString(): string {
    this._checkDeleted();
    const name = this._data.name || this._data.name_t || 'Unnamed';
    return `Space(${this.uid}, ${name})`;
  }
}
