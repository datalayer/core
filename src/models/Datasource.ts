/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// ============================================================================
// OLD API - Kept for backward compatibility
// ============================================================================

export const asDatasource = (s: any): IDatasource => {
  return {
    id: s.uid,
    variant: s.variant_s,
    name: s.name_s,
    description: s.description_t,
    database: s.database_s,
    outputBucket: s.output_bucket_s,
  };
};

export type IDatasourceVariant =
  | 'athena'
  | 'bigquery'
  | 'mssentinel'
  | 'splunk';

export type IDatasource = {
  id: string;
  variant: IDatasourceVariant;
  name: string;
  description: string;
  database: string;
  outputBucket: string;
};

export default IDatasource;

// ============================================================================
// New API Types and DTO
// ============================================================================

import { validateJSON } from '../api/utils/validation';
import type { DatalayerClient } from '../client';

/**
 * Datasource type matching UI and API.
 */
export type DatasourceType =
  | 'Amazon Athena'
  | 'Google BigQuery'
  | 'Microsoft Sentinel'
  | 'Splunk';

/**
 * Raw datasource data from API (snake_case with suffixes).
 */
export interface DatasourceData {
  /** Unique identifier (ULID) */
  uid: string;
  /** Datasource type */
  type_s: DatasourceType;
  /** Datasource name */
  name_s: string;
  /** Datasource description */
  description_t: string;
  /** Datasource variant (athena, bigquery, mssentinel, splunk) */
  variant_s?: string;
  /** Optional: Database name (required for Amazon Athena) */
  database_s?: string;
  /** Optional: S3 output bucket (required for Amazon Athena) */
  output_bucket_s?: string;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * Public JSON interface for Datasource (camelCase).
 */
export interface DatasourceJSON {
  /** Unique identifier */
  uid: string;
  /** Datasource type */
  type: DatasourceType;
  /** Datasource name */
  name: string;
  /** Datasource description */
  description: string;
  /** Optional: Database name */
  database?: string;
  /** Optional: S3 output bucket */
  outputBucket?: string;
  /** Creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Request data for creating a new datasource.
 */
export interface CreateDatasourceRequest {
  /** Datasource type */
  type: DatasourceType;
  /** Datasource name (unique identifier) */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Optional: Database name (required for Amazon Athena) */
  database?: string;
  /** Optional: S3 output bucket (required for Amazon Athena) */
  output_bucket?: string;
}

/**
 * Request data for updating a datasource.
 */
export interface UpdateDatasourceRequest {
  /** Optional: update type */
  type?: DatasourceType;
  /** Optional: update name */
  name?: string;
  /** Optional: update description */
  description?: string;
  /** Optional: update database */
  database?: string;
  /** Optional: update output bucket */
  output_bucket?: string;
}

/**
 * Response from creating a datasource.
 */
export interface CreateDatasourceResponse {
  success: boolean;
  message: string;
  datasource: DatasourceData;
}

/**
 * Response from getting a datasource.
 */
export interface GetDatasourceResponse {
  success: boolean;
  message: string;
  datasource: DatasourceData;
}

/**
 * Response from listing datasources.
 */
export interface ListDatasourcesResponse {
  success: boolean;
  message: string;
  datasources: DatasourceData[];
}

/**
 * Response from updating a datasource.
 */
export interface UpdateDatasourceResponse {
  success: boolean;
  message: string;
  datasource: DatasourceData;
}

/**
 * Datasource domain model for the Datalayer Client.
 * Provides state management and operations for datasources.
 *
 * @example
 * ```typescript
 * const datasource = await client.createDatasource({
 *   type: 'Amazon Athena',
 *   name: 'my-athena-datasource',
 *   description: 'Production Athena datasource',
 *   database: 'my_database',
 *   output_bucket: 's3://my-bucket/output/'
 * });
 *
 * await datasource.update({ description: 'Updated description' });
 * await datasource.delete();
 * ```
 */
export class DatasourceDTO {
  /** @internal */
  _data: DatasourceData;
  private _client: DatalayerClient;
  private _deleted: boolean = false;

  /**
   * Create a Datasource instance.
   * @param data - Datasource data from API
   * @param client - Client instance
   */
  constructor(data: DatasourceData, client: DatalayerClient) {
    this._data = data;
    this._client = client;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Datasource ${this._data.name_s} has been deleted and no longer exists`,
      );
    }
  }

  // ========================================================================
  // Properties
  // ========================================================================

  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  get type(): DatasourceType {
    this._checkDeleted();
    return this._data.type_s;
  }

  get variant(): string | undefined {
    this._checkDeleted();
    return this._data.variant_s;
  }

  get name(): string {
    this._checkDeleted();
    return this._data.name_s;
  }

  get description(): string {
    this._checkDeleted();
    return this._data.description_t;
  }

  get database(): string | undefined {
    this._checkDeleted();
    return this._data.database_s;
  }

  get outputBucket(): string | undefined {
    this._checkDeleted();
    return this._data.output_bucket_s;
  }

  get createdAt(): Date | undefined {
    this._checkDeleted();
    return this._data.created_at ? new Date(this._data.created_at) : undefined;
  }

  get updatedAt(): Date | undefined {
    this._checkDeleted();
    return this._data.updated_at ? new Date(this._data.updated_at) : undefined;
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Update this datasource.
   * @param updates - Fields to update
   * @returns Updated Datasource instance
   */
  async update(updates: UpdateDatasourceRequest): Promise<DatasourceDTO> {
    this._checkDeleted();
    const updated = await this._client.updateDatasource(this.uid, updates);
    return updated;
  }

  /**
   * Delete this datasource permanently.
   */
  async delete(): Promise<void> {
    this._checkDeleted();
    await this._client.deleteDatasource(this.uid);
    this._deleted = true;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get datasource data in camelCase format.
   */
  toJSON(): DatasourceJSON {
    this._checkDeleted();
    const obj = {
      uid: this.uid,
      type: this.type,
      name: this.name,
      description: this.description,
      database: this.database,
      outputBucket: this.outputBucket,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    validateJSON(obj, 'Datasource');
    return obj;
  }

  /**
   * Get raw datasource data exactly as received from API.
   */
  rawData(): DatasourceData {
    this._checkDeleted();
    return this._data;
  }

  toString(): string {
    this._checkDeleted();
    return `Datasource(${this.name}, ${this.type})`;
  }
}
