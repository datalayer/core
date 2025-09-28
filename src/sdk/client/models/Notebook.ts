/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Notebook domain model for the Datalayer SDK.
 *
 * @module sdk/client/models/Notebook
 */

import type {
  Notebook as NotebookData,
  UpdateNotebookRequest,
} from '../../../api/types/spacer';
import * as notebooks from '../../../api/spacer/notebooks';
import type { DatalayerSDK } from '../index';
import { Item } from './Item';

/**
 * Notebook domain model that extends the base Item class.
 * Provides notebook-specific functionality for managing Jupyter notebooks.
 *
 * @example
 * ```typescript
 * const notebook = await sdk.createNotebook(formData);
 * const kernelSpec = await notebook.getKernelSpec();
 * ```
 */
export class Notebook extends Item<NotebookData, UpdateNotebookRequest> {
  /**
   * Create a Notebook instance.
   *
   * @param data - Notebook data from API
   * @param sdk - SDK instance
   */
  constructor(data: NotebookData, sdk: DatalayerSDK) {
    super(data, sdk);
  }

  // ========================================================================
  // Abstract Method Implementations
  // ========================================================================

  /** Document type identifier. */
  get type(): string {
    this._checkDeleted();
    return 'notebook';
  }

  /** The cached name of the notebook. */
  get name(): string {
    this._checkDeleted();
    return (
      this._data.name_t ||
      (this._data as any).notebook_name_s ||
      this._data.name ||
      ''
    );
  }

  /** Get the current name of the notebook from API. */
  async getName(): Promise<string> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await notebooks.getNotebook(token, this.uid, spacerRunUrl);

    if (response.notebook) {
      this._updateData(response.notebook);
      return (
        response.notebook.name_t ||
        (response.notebook as any).notebook_name_s ||
        response.notebook.name ||
        ''
      );
    }

    return this.name;
  }

  /** The cached content. */
  get content(): any {
    this._checkDeleted();
    if (!this._data.content && this._data.model_s) {
      try {
        return JSON.parse(this._data.model_s);
      } catch {
        return this._data.model_s;
      }
    }
    return this._data.content;
  }

  /** Get the notebook content from API. */
  async getContent(): Promise<any> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await notebooks.getNotebook(token, this.uid, spacerRunUrl);

    if (response.notebook) {
      this._updateData(response.notebook);
      if (!response.notebook.content && response.notebook.model_s) {
        try {
          return JSON.parse(response.notebook.model_s);
        } catch {
          return response.notebook.model_s;
        }
      }
      return response.notebook.content;
    }

    return this.content;
  }

  /** Get when the notebook was last updated from API. */
  async getUpdatedAt(): Promise<Date> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await notebooks.getNotebook(token, this.uid, spacerRunUrl);

    if (response.notebook) {
      this._updateData(response.notebook);
      const dateStr =
        response.notebook.last_update_ts_dt ||
        response.notebook.updated_at ||
        response.notebook.creation_ts_dt ||
        response.notebook.created_at;
      if (!dateStr) {
        throw new Error('No timestamp available for notebook');
      }
      return new Date(dateStr);
    }

    const dateStr =
      this._data.last_update_ts_dt ||
      this._data.updated_at ||
      this._data.creation_ts_dt ||
      this._data.created_at;
    if (!dateStr) {
      throw new Error('No timestamp available for notebook');
    }
    return new Date(dateStr);
  }

  /** Update the notebook. */
  async update(data: UpdateNotebookRequest): Promise<this> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await notebooks.updateNotebook(
      token,
      this.uid,
      data,
      spacerRunUrl,
    );
    this._updateData(response.notebook);
    return this;
  }

  // ========================================================================
  // Notebook-specific Properties
  // ========================================================================

  /** File path within the space. */
  get path(): string {
    this._checkDeleted();
    return this._data.path || '';
  }

  /** Version number. */
  get version(): number {
    this._checkDeleted();
    return this._data.version || 0;
  }

  /** Notebook metadata. */
  get metadata(): Record<string, any> {
    this._checkDeleted();
    return this._data.metadata || {};
  }

  // ========================================================================
  // Notebook-specific Methods
  // ========================================================================

  /** Get the kernel specification. */
  async getKernelSpec(): Promise<any> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await notebooks.getNotebook(token, this.uid, spacerRunUrl);

    if (response.notebook) {
      this._updateData(response.notebook);
      return response.notebook.kernel_spec;
    }

    return this._data.kernel_spec;
  }
}

// Re-export the NotebookData type for convenience
export type { NotebookData };
