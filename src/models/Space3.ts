/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Space domain model for the Datalayer SDK.
 *
 * @module models/Space
 */

import type { Space2 as SpaceData, GetSpaceItemsResponse } from './Space2';
import * as users from '../api/spacer/users';
import * as items from '../api/spacer/items';
import * as notebooks from '../api/spacer/notebooks';
import * as lexicals from '../api/spacer/lexicals';
import type { DatalayerClient } from '../index';
import { Notebook2, type NotebookJSON } from './Notebook2';
import { Lexical2, type LexicalJSON } from './Lexical2';
import { ItemTypes } from '../client/constants';
import { convertSpaceItemsToModels } from '../client/utils/spacerUtils';
import { validateJSON } from '../api/utils/validation';

/**
 * Stable public interface for Space data.
 * This is the contract that SDK consumers can rely on.
 * The raw API may change, but this interface remains stable.
 */
export interface SpaceJSON {
  /** ulid for the space */
  uid: string;
  /** Name of the space */
  name: string;
  /** Handle for the space */
  handle: string;
  /** Variant of the space */
  variant: string;
  /** Description of the space */
  description: string;
  /** Items contained in the space (as JSON) */
  items: Array<NotebookJSON | LexicalJSON>;
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
export class Space3 {
  protected _data: SpaceData;
  private _sdk: DatalayerClient;
  private _items: (Notebook2 | Lexical2)[] | null = null;
  private _deleted: boolean = false;

  /**
   * Create a Space instance.
   *
   * @param data - Space data from API
   * @param sdk - SDK instance
   */
  constructor(data: SpaceData, sdk: DatalayerClient) {
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
  async refresh(): Promise<void> {
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

  /** URL-friendly handle for the space. */
  get handle(): string {
    this._checkDeleted();
    return this._data.handle_s;
  }

  /** Space variant type. */
  get variant(): string {
    this._checkDeleted();
    return this._data.variant_s;
  }

  /**
   * The name of the space.
   */
  get name(): string {
    return this._data.name_t;
  }

  /**
   * The description of the space.
   */
  get description(): string {
    return this._data.description_t;
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
  private async _createItem<T extends Notebook2 | Lexical2>(data: {
    name: string;
    type: string;
    description: string;
    file?: File | Blob;
  }): Promise<T> {
    this._checkDeleted();

    // Get necessary configuration from SDK
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();

    if (data.type === ItemTypes.NOTEBOOK) {
      const requestData = {
        spaceId: this.uid,
        name: data.name,
        description: data.description,
        notebookType: data.type,
        file: data.file,
      };
      const response = await notebooks.createNotebook(
        token,
        requestData,
        spacerRunUrl,
      );
      if (!response.notebook) {
        throw new Error('Failed to create notebook: No notebook returned');
      } else {
        return new Notebook2(response.notebook, this._sdk) as T;
      }
    } else if (data.type === ItemTypes.LEXICAL) {
      const requestData = {
        spaceId: this.uid,
        name: data.name,
        description: data.description,
        documentType: data.type,
        file: data.file,
      };
      const response = await lexicals.createLexical(
        token,
        requestData,
        spacerRunUrl,
      );
      if (!response.document) {
        throw new Error(
          'Failed to create lexical document: No document returned',
        );
      } else {
        return new Lexical2(response.document, this._sdk) as T;
      }
    } else {
      throw new Error(`Unsupported item type: ${data.type}`);
    }
  }

  /**
   * Get all items in this space as model instances.
   *
   * @returns Array of Notebook and Lexical model instances
   */
  async getItems(): Promise<(Notebook2 | Lexical2)[]> {
    this._checkDeleted();
    const token = (this._sdk as any).getToken();
    const spacerRunUrl = (this._sdk as any).getSpacerRunUrl();

    const response: GetSpaceItemsResponse = await items.getSpaceItems(
      token,
      this.uid,
      spacerRunUrl,
    );

    // Use shared utility function to convert items to model instances
    this._items = convertSpaceItemsToModels(response.items || [], this._sdk);
    return this._items;
  }

  /**
   * Create a new notebook in this space.
   *
   * @param data - Notebook creation configuration
   * @returns Created Notebook instance
   */
  async createNotebook(data: {
    name: string;
    description: string;
    file?: File | Blob;
  }): Promise<Notebook2> {
    return this._createItem({
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
    description: string;
    file?: File | Blob;
  }): Promise<Lexical2> {
    return this._createItem({
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
    const obj = {
      uid: this.uid,
      name: this.name,
      description: this.description,
      variant: this.variant,
      handle: this.handle,
      items: this._data.items
        ? convertSpaceItemsToModels(this._data.items, this._sdk).map(item =>
            item.toJSON(),
          )
        : [],
    };
    validateJSON(obj, 'Space');
    return obj;
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
    return `Space(${this.uid}, ${this.name})`;
  }
}
