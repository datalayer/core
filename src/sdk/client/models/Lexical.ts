/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Lexical domain model for the Datalayer SDK.
 *
 * @module sdk/client/models/Lexical
 */

import type {
  Lexical as LexicalData,
  UpdateLexicalRequest,
} from '../../../api/types/spacer';
import * as lexicals from '../../../api/spacer/lexicals';
import type { DatalayerSDK } from '../index';
import { Item } from './Item';

/**
 * Lexical domain model that extends the base Item class.
 * Provides lexical document functionality for managing rich text documents.
 *
 * @example
 * ```typescript
 * const lexical = await sdk.createLexical(formData);
 * await lexical.update({ name: 'Updated Documentation' });
 * ```
 */
export class Lexical extends Item<LexicalData, UpdateLexicalRequest> {
  /**
   * Create a Lexical instance.
   *
   * @param data - Lexical data from API
   * @param sdk - SDK instance
   */
  constructor(data: LexicalData, sdk: DatalayerSDK) {
    super(data, sdk);
  }

  // ========================================================================
  // Abstract Method Implementations
  // ========================================================================

  /** Document type identifier. */
  get type(): string {
    this._checkDeleted();
    return this._data.type_s || 'lexical';
  }

  /** The cached name of the document. */
  get name(): string {
    this._checkDeleted();
    return this._data.name_t || this._data.name || '';
  }

  /** Get the current name of the document from API. */
  async getName(): Promise<string> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await lexicals.getLexical(token, this.uid, spacerRunUrl);

    if (response.document) {
      this._updateData(response.document);
      return response.document.name_t || response.document.name || '';
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

  /** Get the document content from API. */
  async getContent(): Promise<any> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await lexicals.getLexical(token, this.uid, spacerRunUrl);

    if (response.document) {
      this._updateData(response.document);
      if (!response.document.content && response.document.model_s) {
        try {
          return JSON.parse(response.document.model_s);
        } catch {
          return response.document.model_s;
        }
      }
      return response.document.content;
    }

    return this.content;
  }

  /** Get when the document was last updated from API. */
  async getUpdatedAt(): Promise<Date> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await lexicals.getLexical(token, this.uid, spacerRunUrl);

    if (response.document) {
      this._updateData(response.document);
      const dateStr =
        response.document.last_update_ts_dt ||
        response.document.updated_at ||
        response.document.creation_ts_dt ||
        response.document.created_at;
      if (!dateStr) {
        throw new Error('No timestamp available for lexical document');
      }
      return new Date(dateStr);
    }

    const dateStr =
      this._data.last_update_ts_dt ||
      this._data.updated_at ||
      this._data.creation_ts_dt ||
      this._data.created_at;
    if (!dateStr) {
      throw new Error('No timestamp available for lexical document');
    }
    return new Date(dateStr);
  }

  /** Update the document. */
  async update(data: UpdateLexicalRequest): Promise<this> {
    this._checkDeleted();
    const token = this._getToken();
    const spacerRunUrl = this._getSpacerRunUrl();
    const response = await lexicals.updateLexical(
      token,
      this.uid,
      data,
      spacerRunUrl,
    );
    this._updateData(response.document);
    return this;
  }
}

// Re-export the LexicalData type for convenience
export type { LexicalData };
