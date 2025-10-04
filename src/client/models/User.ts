/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * User model for the Datalayer SDK with rich functionality.
 *
 * @module client/models/User
 */

import type { User as UserData } from '../../api/types/iam';
import type { DatalayerClient } from '../index';
import { validateJSON } from '../../api/utils/validation';

export interface UserJSON {
  /** uuid for the user */
  id: string;
  /** ulid for the user */
  uid: string;
  /** First name of the user */
  firstName: string;
  /** Last name of the user */
  lastName: string;
  /** Display name of the user */
  displayName: string;
  /** Email address of the user */
  email: string;
  /** Description of the user */
  handle: string;
  /** URL to the user's avatar image */
  avatarUrl: string;
}

/**
 * User model representing a Datalayer platform user.
 * Provides rich functionality for accessing user data and authentication providers.
 */
export class User {
  protected _data: UserData;

  /**
   * Create a User instance.
   *
   * @param data - User data from API
   * @param sdk - SDK instance (currently unused but kept for compatibility)
   */
  constructor(data: UserData, sdk?: DatalayerClient) {
    this._data = data;
  }

  // Basic properties
  get id(): string {
    return this._data.id;
  }

  get uid(): string {
    return this._data.uid;
  }

  get email(): string {
    return this._data.email_s;
  }

  get handle(): string {
    return this._data.handle_s;
  }

  get firstName(): string {
    return this._data.first_name_t;
  }

  get lastName(): string {
    return this._data.last_name_t;
  }

  get displayName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get avatarUrl(): string {
    return this._data.avatar_url_s;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get user data in camelCase format.
   * Returns only the core fields that consumers need.
   * This provides a stable interface regardless of API changes.
   *
   * @returns Core user data with camelCase properties
   */
  toJSON(): UserJSON {
    const obj = {
      id: this.id,
      uid: this.uid,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.displayName,
      email: this.email,
      handle: this.handle,
      avatarUrl: this.avatarUrl,
    };
    validateJSON(obj, 'User');
    return obj;
  }

  /**
   * Get the raw user data exactly as received from the API.
   * This preserves the original snake_case naming from the API response.
   *
   * @returns Raw user data from API
   */
  rawData(): UserData {
    return this._data;
  }

  /** String representation of the user. */
  toString(): string {
    return `User(${this.uid}, ${this.displayName})`;
  }
}
