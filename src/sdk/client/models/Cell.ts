/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/Cell
 * @description Cell domain model for the Datalayer SDK.
 *
 * This model provides a rich, object-oriented interface for working with
 * individual notebook cells, extending the base Item class with cell-specific functionality.
 */

import type { DatalayerSDK } from '../index';
import { Item } from './Item';

/**
 * Cell data structure from API responses.
 * Placeholder type - should be defined in API types when available.
 */
interface CellData {
  id: string;
  uid: string;
  type_s?: string;
  name?: string;
  name_t?: string;
  content?: any;
  model_s?: string;
  space_id?: string;
  s3_path_s?: string;
  owner_id?: string;
  creator_uid?: string;
  creation_ts_dt?: string;
  created_at?: string;
  last_update_ts_dt?: string;
  updated_at?: string;
  cell_type?: string;
  source?: string;
  outputs?: any[];
  execution_count?: number;
  metadata?: Record<string, any>;
}

/**
 * Cell update request structure.
 * Placeholder type - should be defined in API types when available.
 */
interface UpdateCellRequest {
  name?: string;
  description?: string;
  source?: string;
  cell_type?: string;
  metadata?: Record<string, any>;
}

/**
 * Cell domain model that extends the base Item class.
 *
 * Provides cell-specific functionality for managing individual notebook cells
 * with content, execution state, and metadata management.
 *
 * @example
 * ```typescript
 * // Cells are typically obtained from notebook content or space items
 * const items = await space.getItems();
 * const cells = items.filter(item => item instanceof Cell);
 *
 * for (const cell of cells) {
 *   console.log(cell.cellType);
 *   console.log(cell.source);
 *   console.log(cell.executionCount);
 * }
 * ```
 */
export class Cell extends Item<CellData, UpdateCellRequest> {
  /**
   * Create a Cell instance.
   *
   * @param data - Raw cell data from API
   * @param sdk - DatalayerSDK instance for making API calls
   */
  constructor(data: CellData, sdk: DatalayerSDK) {
    super(data, sdk);
  }

  // ========================================================================
  // Abstract Method Implementations
  // ========================================================================

  /**
   * Item type identifier.
   */
  get type(): string {
    this._checkDeleted();
    return 'cell';
  }

  /**
   * Get the cached name of the cell (synchronous).
   */
  get name(): string {
    this._checkDeleted();
    return this._data.name_t || this._data.name || `Cell ${this.id}`;
  }

  /**
   * Get the current name of the cell from API.
   * Note: Cells may not have individual API endpoints, this is a placeholder implementation.
   */
  async getName(): Promise<string> {
    this._checkDeleted();
    // TODO: Implement when cell-specific API endpoints are available
    return this.name;
  }

  /**
   * Get the cached content (synchronous).
   */
  get content(): any {
    this._checkDeleted();
    if (!this._data.content && this._data.model_s) {
      try {
        return JSON.parse(this._data.model_s);
      } catch {
        return this._data.model_s;
      }
    }
    return this._data.content || this._data.source;
  }

  /**
   * Get the cell content from API.
   * Note: Cells may not have individual API endpoints, this is a placeholder implementation.
   */
  async getContent(): Promise<any> {
    this._checkDeleted();
    // TODO: Implement when cell-specific API endpoints are available
    return this.content;
  }

  /**
   * Get when the cell was last updated from API.
   * Note: Cells may not have individual API endpoints, this is a placeholder implementation.
   */
  async getUpdatedAt(): Promise<Date> {
    this._checkDeleted();
    // TODO: Implement when cell-specific API endpoints are available
    const dateStr =
      this._data.last_update_ts_dt ||
      this._data.updated_at ||
      this._data.creation_ts_dt ||
      this._data.created_at;
    if (!dateStr) {
      throw new Error('No timestamp available for cell');
    }
    return new Date(dateStr);
  }

  /**
   * Update the cell.
   * Note: Cell updates may need to go through parent notebook, this is a placeholder implementation.
   */
  async update(data: UpdateCellRequest): Promise<this> {
    this._checkDeleted();
    // TODO: Implement when cell-specific API endpoints are available
    // Cells might be updated through their parent notebook rather than directly
    throw new Error(
      'Cell updates not yet implemented - update through parent notebook',
    );
  }

  // ========================================================================
  // Cell-specific Properties
  // ========================================================================

  /**
   * Cell type (code, markdown, raw).
   */
  get cellType(): string {
    this._checkDeleted();
    return this._data.cell_type || 'code';
  }

  /**
   * Cell source code or markdown content.
   */
  get source(): string {
    this._checkDeleted();
    return this._data.source || '';
  }

  /**
   * Cell outputs (for code cells).
   */
  get outputs(): any[] {
    this._checkDeleted();
    return this._data.outputs || [];
  }

  /**
   * Execution count (for code cells).
   */
  get executionCount(): number | null {
    this._checkDeleted();
    return this._data.execution_count || null;
  }

  /**
   * Cell metadata.
   */
  get metadata(): Record<string, any> {
    this._checkDeleted();
    return this._data.metadata || {};
  }

  // ========================================================================
  // Cell-specific Methods
  // ========================================================================

  /**
   * Check if this is a code cell.
   */
  get isCodeCell(): boolean {
    return this.cellType === 'code';
  }

  /**
   * Check if this is a markdown cell.
   */
  get isMarkdownCell(): boolean {
    return this.cellType === 'markdown';
  }

  /**
   * Check if this is a raw cell.
   */
  get isRawCell(): boolean {
    return this.cellType === 'raw';
  }

  /**
   * Check if this cell has been executed (for code cells).
   */
  get hasBeenExecuted(): boolean {
    return this.executionCount !== null && this.executionCount > 0;
  }

  /**
   * Get the cell's display content based on type.
   */
  get displayContent(): string {
    if (this.isCodeCell) {
      return `[${this.executionCount || ' '}] ${this.source}`;
    }
    return this.source;
  }
}
