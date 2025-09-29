/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Notebook domain model for the Datalayer SDK.
 *
 * @module client/models/Notebook
 */

import type {
  Notebook as NotebookData,
  UpdateNotebookRequest,
} from '../../api/types/spacer';
import * as notebooks from '../../api/spacer/notebooks';
import type { DatalayerClient } from '../index';
import { Item } from './Item';
import { ItemTypes } from '../constants';

/**
 * Stable public interface for Notebook data.
 * This is the contract that SDK consumers can rely on.
 * The raw API may change, but this interface remains stable.
 */
export interface NotebookJSON {
  /** Unique identifier for the notebook */
  id: string;
  /** Name of the notebook */
  name: string;
  /** Description of the notebook */
  description?: string;
  /** Type of notebook */
  type: string;
  /** File extension of the notebook */
  extension: string;
  /** Kernel specification name */
  kernelSpec?: string;
  /** ISO 8601 timestamp when the notebook was created */
  createdAt?: string;
  /** ISO 8601 timestamp when the notebook was last updated */
  updatedAt?: string;
}

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
export class Notebook extends Item<NotebookData> {
  /**
   * Create a Notebook instance.
   *
   * @param data - Notebook data from API
   * @param sdk - SDK instance
   */
  constructor(data: NotebookData, sdk: DatalayerClient) {
    super(data, sdk);
  }

  // ========================================================================
  // Abstract Method Implementations
  // ========================================================================

  /** Document type identifier. */
  get type(): string {
    this._checkDeleted();
    return ItemTypes.NOTEBOOK;
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
  async update(name?: string, description?: string): Promise<this> {
    // FIXME: check if both are needed, and use the existing values if only one provided
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const updateData: UpdateNotebookRequest = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const response = await notebooks.updateNotebook(
      token,
      this.uid,
      updateData,
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

  /** Kernel specification (cached). */
  get kernelSpec(): any {
    this._checkDeleted();
    return this._data.kernel_spec;
  }

  /** Description of the notebook. */
  get description(): string {
    this._checkDeleted();
    return this._data.description_t || '';
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

  /** Get the notebook extension. */
  get extension(): string {
    this._checkDeleted();
    const ext = this._data.notebook_extension_s;
    return ext ? (ext.startsWith('.') ? ext : `.${ext}`) : '.ipynb';
  }

  /**
   * Get notebook data in camelCase format.
   * Returns only the core fields that consumers need.
   * This provides a stable interface regardless of API changes.
   *
   * @returns Core notebook data with camelCase properties
   */
  toJSON(): NotebookJSON {
    this._checkDeleted();
    return {
      id: this.id,
      name: this.name,
      description: this.description || undefined,
      type: this.type,
      extension: this.extension,
      kernelSpec: this.kernelSpec || undefined,
      createdAt: this._data.created_at,
      updatedAt: this._data.updated_at,
    };
  }

  /**
   * Get the raw notebook data exactly as received from the API.
   * This preserves the original snake_case naming from the API response.
   *
   * @returns Raw notebook data from API
   */
  rawData(): NotebookData {
    this._checkDeleted();
    return this._data;
  }
}
