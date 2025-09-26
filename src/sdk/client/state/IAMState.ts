/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/state/IAMState
 * @description IAM state management with caching and persistence.
 *
 * Handles authentication state including tokens, user data, and OAuth providers.
 */

import {
  PlatformStorage,
  StorageKeys,
  parseStoredData,
  stringifyForStorage,
} from '../storage';
import type { User, GitHubUser, GitHubUserData } from '../models/User';

/**
 * Stored user data structure.
 */
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

/**
 * IAM state manager for authentication and user data.
 *
 * Features:
 * - Token management with optional refresh tokens
 * - User profile caching
 * - GitHub user caching with TTL
 * - OAuth provider state
 * - Service URL persistence
 *
 * @example
 * ```typescript
 * const storage = new BrowserStorage();
 * const iamState = new IAMState(storage);
 *
 * // Store authentication
 * await iamState.setToken('my-token');
 * await iamState.setUser(userModel);
 *
 * // Retrieve cached data
 * const token = await iamState.getToken();
 * const user = await iamState.getUser();
 * ```
 */
export class IAMState {
  constructor(private storage: PlatformStorage) {}

  // ========================================================================
  // Authentication
  // ========================================================================

  /**
   * Get stored authentication token.
   */
  async getToken(): Promise<string | null> {
    return await this.storage.get(StorageKeys.TOKEN);
  }

  /**
   * Store authentication token.
   */
  async setToken(token: string): Promise<void> {
    await this.storage.set(StorageKeys.TOKEN, token);
  }

  /**
   * Get stored refresh token.
   */
  async getRefreshToken(): Promise<string | null> {
    return await this.storage.get(StorageKeys.REFRESH_TOKEN);
  }

  /**
   * Store refresh token.
   */
  async setRefreshToken(token: string): Promise<void> {
    await this.storage.set(StorageKeys.REFRESH_TOKEN, token);
  }

  /**
   * Clear authentication tokens.
   */
  async clearTokens(): Promise<void> {
    await this.storage.remove(StorageKeys.TOKEN);
    await this.storage.remove(StorageKeys.REFRESH_TOKEN);
  }

  // ========================================================================
  // User Management
  // ========================================================================

  /**
   * Get cached user data.
   *
   * Note: Returns raw data, not User model instance.
   * The SDK will reconstruct the User model.
   */
  async getUser(): Promise<StoredUser | null> {
    const data = await this.storage.get(StorageKeys.USER);
    return parseStoredData<StoredUser>(data);
  }

  /**
   * Cache user data.
   *
   * @param user - User model or raw user data
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

  /**
   * Clear cached user data.
   */
  async clearUser(): Promise<void> {
    await this.storage.remove(StorageKeys.USER);
  }

  // ========================================================================
  // GitHub User Caching
  // ========================================================================

  /**
   * Get cached GitHub user data.
   *
   * @param username - GitHub username
   * @returns GitHub user data or null if not cached/expired
   */
  async getCachedGitHubUser(username: string): Promise<GitHubUserData | null> {
    const key = `${StorageKeys.GITHUB_USER_PREFIX}${username}`;
    const data = await this.storage.get(key);
    if (!data) return null;

    const cached = parseStoredData<{
      user: GitHubUserData;
      timestamp: number;
    }>(data);

    if (!cached) return null;

    // Check if cache is expired (24 hours)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (now - cached.timestamp > maxAge) {
      await this.storage.remove(key);
      return null;
    }

    return cached.user;
  }

  /**
   * Cache GitHub user data.
   *
   * @param username - GitHub username
   * @param user - GitHub user data or model
   */
  async cacheGitHubUser(
    username: string,
    user: GitHubUser | GitHubUserData,
  ): Promise<void> {
    const key = `${StorageKeys.GITHUB_USER_PREFIX}${username}`;
    const userData: GitHubUserData = 'toJSON' in user ? user.toJSON() : user;

    const cacheData = {
      user: userData,
      timestamp: Date.now(),
    };

    await this.storage.set(key, stringifyForStorage(cacheData));
  }

  /**
   * Clear all cached GitHub users.
   */
  async clearGitHubUserCache(): Promise<void> {
    // This would need to iterate through storage keys
    // For now, we'll just document that clear() will handle it
    // In a real implementation, we'd track cached keys
  }

  // ========================================================================
  // Service URLs
  // ========================================================================

  /**
   * Get stored IAM service URL.
   */
  async getIamUrl(): Promise<string | null> {
    return await this.storage.get(StorageKeys.IAM_URL);
  }

  /**
   * Store IAM service URL.
   */
  async setIamUrl(url: string): Promise<void> {
    await this.storage.set(StorageKeys.IAM_URL, url);
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Clear all IAM-related state.
   *
   * This includes tokens, user data, and caches.
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
   * @returns True if a token exists
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token !== '';
  }

  /**
   * Get authentication headers.
   *
   * @returns Headers object with authorization if authenticated
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
