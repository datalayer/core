/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const asSecret = (s: any): ISecret => {
  return {
    id: s.uid,
    variant: s.variant_s,
    name: s.name_s,
    description: s.description_t,
    value: s.value_s,
  };
};

export type ISecretVariant = 'generic' | 'password' | 'key' | 'token';

export type ISecret = {
  id: string;
  variant: ISecretVariant;
  name: string;
  description: string;
  value: string;
};

export default ISecret;

// ============================================================================
// New API Types and DTO
// ============================================================================

import { validateJSON } from '../api/utils/validation';
import type { DatalayerClient } from '../client';

/**
 * Raw secret data from API (snake_case with suffixes).
 */
export interface SecretData {
  /** Unique identifier (ULID) */
  uid: string;
  /** Secret variant/type */
  variant_s: ISecretVariant;
  /** Secret name */
  name_s: string;
  /** Secret description */
  description_t: string;
  /** Base64-encoded secret value */
  value_s: string;
}

/**
 * Public JSON interface for Secret (camelCase).
 */
export interface SecretJSON {
  /** Unique identifier */
  uid: string;
  /** Secret type */
  variant: ISecretVariant;
  /** Secret name */
  name: string;
  /** Secret description */
  description: string;
  /** Decoded secret value (plain text) */
  value: string;
}

/**
 * Request data for creating a new secret.
 * @public
 */
export interface CreateSecretRequest {
  /** Secret type/variant (defaults to 'generic' if not provided) */
  variant?: ISecretVariant;
  /** Secret name (unique identifier) */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Plain text value (will be Base64 encoded by Client) */
  value: string;
}

/**
 * Request data for updating a secret.
 * @public
 */
export interface UpdateSecretRequest {
  /** Optional: update variant */
  variant?: ISecretVariant;
  /** Optional: update name */
  name?: string;
  /** Optional: update description */
  description?: string;
  /** Optional: update value (plain text, will be Base64 encoded) */
  value?: string;
}

/**
 * Response from creating a secret.
 * @public
 */
export interface CreateSecretResponse {
  success: boolean;
  message: string;
  secret: SecretData;
}

/**
 * Response from getting a secret.
 * @public
 */
export interface GetSecretResponse {
  success: boolean;
  message: string;
  secret: SecretData;
}

/**
 * Response from listing secrets.
 * @public
 */
export interface ListSecretsResponse {
  success: boolean;
  message: string;
  secrets: SecretData[];
}

/**
 * Response from updating a secret.
 * @public
 */
export interface UpdateSecretResponse {
  success: boolean;
  message: string;
  secret: SecretData;
}

/**
 * Response from deleting a secret.
 */
export interface DeleteSecretResponse {
  success: boolean;
  message: string;
}

/**
 * Secret domain model for the Datalayer Client.
 * Provides state management and operations for user secrets.
 *
 * @example
 * ```typescript
 * const secret = await client.createSecret({
 *   variant: 'password',
 *   name: 'db_password',
 *   description: 'Production DB password',
 *   value: 'my-secure-password'
 * });
 *
 * await secret.update({ description: 'Updated description' });
 * await secret.delete();
 * ```
 * @public
 */
export class SecretDTO {
  /** @internal */
  _data: SecretData;
  private _client: DatalayerClient;
  private _deleted: boolean = false;

  /**
   * Create a Secret instance.
   * @param data - Secret data from API
   * @param client - Client instance
   */
  constructor(data: SecretData, client: DatalayerClient) {
    this._data = data;
    this._client = client;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private _checkDeleted(): void {
    if (this._deleted) {
      throw new Error(
        `Secret ${this._data.name_s} has been deleted and no longer exists`,
      );
    }
  }

  private _decodeValue(encodedValue: string): string {
    try {
      if (typeof Buffer !== 'undefined') {
        // Node.js environment
        return Buffer.from(encodedValue, 'base64').toString();
      } else {
        // Browser environment
        return atob(encodedValue);
      }
    } catch (error) {
      console.error('Failed to decode secret value:', error);
      return encodedValue; // Return as-is if decode fails
    }
  }

  // ========================================================================
  // Properties
  // ========================================================================

  get uid(): string {
    this._checkDeleted();
    return this._data.uid;
  }

  get variant(): ISecretVariant {
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

  /** Returns decoded (plain text) secret value */
  get value(): string {
    this._checkDeleted();
    return this._decodeValue(this._data.value_s);
  }

  // ========================================================================
  // Action Methods
  // ========================================================================

  /**
   * Update this secret.
   * @param updates - Fields to update
   * @returns Updated Secret instance
   */
  async update(updates: UpdateSecretRequest): Promise<SecretDTO> {
    this._checkDeleted();
    const updated = await this._client.updateSecret(this.uid, updates);
    return updated;
  }

  /**
   * Delete this secret permanently.
   */
  async delete(): Promise<void> {
    this._checkDeleted();
    await this._client.deleteSecret(this.uid);
    this._deleted = true;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get secret data in camelCase format.
   */
  toJSON(): SecretJSON {
    this._checkDeleted();
    const obj = {
      uid: this.uid,
      variant: this.variant,
      name: this.name,
      description: this.description,
      value: this.value, // Returns decoded value
    };
    validateJSON(obj, 'Secret');
    return obj;
  }

  /**
   * Get raw secret data exactly as received from API.
   */
  rawData(): SecretData {
    this._checkDeleted();
    return this._data;
  }

  toString(): string {
    this._checkDeleted();
    return `Secret(${this.name}, ${this.variant})`;
  }
}
