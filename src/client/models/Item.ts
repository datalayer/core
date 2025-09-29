/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Abstract base class for all Datalayer content items.
 *
 * @module client/models/Item
 */

import * as items from '../../api/spacer/items';
import type { DatalayerClient } from '../index';

/**
 * Abstract base class for all Datalayer content items.
 * Provides common functionality for content management including lifecycle tracking.
 *
 * @template TData - Raw data type from API
 * @template TUpdateRequest - Update request type for API
 */
export abstract class Item<TData> {
  protected _data: TData;
  private _sdk: DatalayerClient;
  private _deleted: boolean = false;

  /**
   * Create an Item instance.
   * @param data - Item data from API
   * @param sdk - SDK instance
   */
  constructor(data: TData, sdk: DatalayerClient) {
    this._data = data;
    this._sdk = sdk;
  }

  // ========================================================================
  // Deletion State Management
  // ========================================================================

  /** Check if this item has been deleted. */
  get isDeleted(): boolean {
    return this._deleted;
  }

  /**
   * Check if this item has been deleted and throw error if so.
   * @throws Error if deleted
   */
  protected _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `${this.constructor.name} ${(this._data as any).id} has been deleted and no longer exists`,
      );
    }
  }

  // ========================================================================
  // Static Properties (set at creation, never change)
  // ========================================================================

  /** Item ID. */
  get id(): string {
    this._checkDeleted();
    return (this._data as any).id;
  }

  /** Unique identifier for the item. */
  get uid(): string {
    this._checkDeleted();
    return (this._data as any).uid;
  }

  /** Parent space ID. */
  get spaceId(): string {
    this._checkDeleted();

    // Try the direct field first (if API provides it)
    if ((this._data as any).space_id) {
      return (this._data as any).space_id;
    }

    // Extract from s3_path_s if available: "datalayer.app/SPACE_ID/..."
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

  /** Owner user ID. */
  get ownerId(): string {
    this._checkDeleted();
    return (
      (this._data as any).owner_id || (this._data as any).creator_uid || ''
    );
  }

  /** When the item was created. */
  get createdAt(): Date {
    this._checkDeleted();
    const dateStr =
      (this._data as any).creation_ts_dt || (this._data as any).created_at;
    if (!dateStr) {
      throw new Error(
        `No creation timestamp available for ${this.constructor.name.toLowerCase()}`,
      );
    }
    return new Date(dateStr);
  }

  /** The cached update time. */
  get updatedAt(): Date | null {
    this._checkDeleted();
    const dateStr =
      (this._data as any).last_update_ts_dt ||
      (this._data as any).updated_at ||
      (this._data as any).creation_ts_dt ||
      (this._data as any).created_at;
    if (!dateStr) {
      return null;
    }
    return new Date(dateStr);
  }

  // ========================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ========================================================================

  /** Get the item type identifier. */
  abstract get type(): string;

  /** The cached name. */
  abstract get name(): string;

  /** Get the current name from API. */
  abstract getName(): Promise<string>;

  /** The cached content. */
  abstract get content(): any;

  /** Get the current content from API. */
  abstract getContent(): Promise<any>;

  /** Get when the item was last updated from API. */
  abstract getUpdatedAt(): Promise<Date>;

  /** Update the item. */
  abstract update(...args: any[]): Promise<this>;

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Delete this item permanently.
   * After deletion, all subsequent method calls will throw errors.
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

  /** Get raw item data object. */
  rawData(): TData {
    this._checkDeleted();
    return this._data;
  }

  /** Convert to JSON representation - must be implemented by subclasses. */
  abstract toJSON(): any;

  /** String representation of the item. */
  toString(): string {
    this._checkDeleted();
    const name = this.name || 'Unnamed';
    return `${this.constructor.name}(${this.id}, ${name})`;
  }

  // ========================================================================
  // Protected Helper Methods
  // ========================================================================

  /** Get SDK token for API calls. */
  protected _getToken(): string {
    return (this._sdk as any).getToken();
  }

  /** Get spacer API URL for API calls. */
  protected _getSpacerRunUrl(): string {
    return (this._sdk as any).getSpacerRunUrl();
  }

  /** Update internal data after API call. */
  protected _updateData(newData: TData): void {
    this._data = newData;
  }
}
