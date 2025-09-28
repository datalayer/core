/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * IAM state management with caching and persistence.
 * @module sdk/client/state/IAMState
 */

import {
  PlatformStorage,
  StorageKeys,
  parseStoredData,
  stringifyForStorage,
} from '../storage';
import type { User } from '../models/User';

/** Stored user data structure. */
interface StoredUser {
  uid: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  credits?: number;
  isActive?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // OAuth providers
  githubId?: string;
  githubUsername?: string;
  linkedinId?: string;
}

/** IAM state manager for authentication and user data. */
export class IAMState {
  constructor(private storage: PlatformStorage) {}

  // ========================================================================
  // Authentication
  // ========================================================================

  /** Get stored authentication token. */
  async getToken(): Promise<string | null> {
    return await this.storage.get(StorageKeys.TOKEN);
  }

  /** Store authentication token. */
  async setToken(token: string): Promise<void> {
    await this.storage.set(StorageKeys.TOKEN, token);
  }

  /** Get stored refresh token. */
  async getRefreshToken(): Promise<string | null> {
    return await this.storage.get(StorageKeys.REFRESH_TOKEN);
  }

  /** Store refresh token. */
  async setRefreshToken(token: string): Promise<void> {
    await this.storage.set(StorageKeys.REFRESH_TOKEN, token);
  }

  /** Clear authentication tokens. */
  async clearTokens(): Promise<void> {
    await this.storage.remove(StorageKeys.TOKEN);
    await this.storage.remove(StorageKeys.REFRESH_TOKEN);
  }

  // ========================================================================
  // User Management
  // ========================================================================

  /**
   * Get cached user data.
   * Returns raw data, not User model instance.
   */
  async getUser(): Promise<StoredUser | null> {
    const data = await this.storage.get(StorageKeys.USER);
    return parseStoredData<StoredUser>(data);
  }

  /**
   * Cache user data.
   *
   * @param user User model or raw data
   */
  async setUser(user: User | StoredUser): Promise<void> {
    // Extract relevant data from User model if needed
    let userData: StoredUser;
    if ('toJSON' in user) {
      const jsonData = user.toJSON();
      userData = {
        uid: jsonData.id, // Map id to uid for storage
        email: jsonData.email,
        username: jsonData.username || jsonData.handle || '',
        firstName: jsonData.first_name,
        lastName: jsonData.last_name,
        credits: (jsonData as any).credits,
        isActive: jsonData.is_active,
        isAdmin: (jsonData as any).is_admin,
        createdAt: jsonData.created_at,
        updatedAt: jsonData.updated_at,
      };
    } else {
      userData = user;
    }
    await this.storage.set(StorageKeys.USER, stringifyForStorage(userData));
  }

  /** Clear cached user data. */
  async clearUser(): Promise<void> {
    await this.storage.remove(StorageKeys.USER);
  }

  // ========================================================================
  // Service URLs
  // ========================================================================

  /** Get stored IAM service URL. */
  async getIamUrl(): Promise<string | null> {
    return await this.storage.get(StorageKeys.IAM_URL);
  }

  /** Store IAM service URL. */
  async setIamUrl(url: string): Promise<void> {
    await this.storage.set(StorageKeys.IAM_URL, url);
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Clear all IAM-related state.
   */
  async clear(): Promise<void> {
    await this.clearTokens();
    await this.clearUser();
    // Note: This would also clear GitHub user cache
    // but we need storage iteration for that
  }

  /**
   * Check if user is authenticated.
   *
   * @returns True if token exists
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token !== '';
  }

  /**
   * Get authentication headers.
   *
   * @returns Headers with authorization if authenticated
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }
}
