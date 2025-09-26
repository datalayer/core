/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/models/User
 * @description User model for the Datalayer SDK with rich functionality.
 */

import type { User as ApiUser } from '../../../api/types/iam';
import type { DatalayerSDKBase } from '../base';

export interface AuthProvider {
  type: 'github' | 'linkedin';
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  raw?: any;
}

export interface GitHubUserData {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
  location?: string;
  blog?: string;
  twitter_username?: string;
  public_repos?: number;
  followers?: number;
  following?: number;
  created_at?: string;
  updated_at?: string;
  html_url?: string;
}

/**
 * GitHub user model with helper methods.
 */
export class GitHubUser {
  constructor(
    public readonly data: GitHubUserData,
    // SDK instance for future use (API calls, etc)
    // @ts-ignore - Will be used for future API calls
    private readonly sdk: DatalayerSDKBase,
  ) {}

  get id(): number {
    return this.data.id;
  }

  get login(): string {
    return this.data.login;
  }

  get name(): string | undefined {
    return this.data.name;
  }

  get email(): string | undefined {
    return this.data.email;
  }

  get avatarUrl(): string | undefined {
    return this.data.avatar_url;
  }

  get bio(): string | undefined {
    return this.data.bio;
  }

  get company(): string | undefined {
    return this.data.company;
  }

  get location(): string | undefined {
    return this.data.location;
  }

  get profileUrl(): string | undefined {
    return this.data.html_url;
  }

  /**
   * Get display name with fallback to login.
   */
  getDisplayName(): string {
    return this.data.name || this.data.login;
  }

  /**
   * Check if user is from a specific organization.
   */
  isFromOrganization(org: string): boolean {
    return (
      this.data.company?.toLowerCase().includes(org.toLowerCase()) || false
    );
  }

  /**
   * Get avatar URL with size parameter.
   */
  getAvatarUrl(size = 200): string {
    if (!this.data.avatar_url) return '';
    return `${this.data.avatar_url}${this.data.avatar_url.includes('?') ? '&' : '?'}s=${size}`;
  }

  /**
   * Convert to plain JSON object.
   */
  toJSON(): GitHubUserData {
    return { ...this.data };
  }
}

/**
 * User model representing a Datalayer platform user.
 * Provides rich functionality for accessing user data and authentication providers.
 */
export class User {
  private _providers?: AuthProvider[];
  private _githubUser?: GitHubUser;
  private _githubUserPromise?: Promise<GitHubUser | undefined>;

  constructor(
    private data: ApiUser,
    private readonly sdk: DatalayerSDKBase,
  ) {}

  // Basic properties
  get id(): string {
    return this.data.id;
  }

  get uid(): string | undefined {
    return this.data.uid;
  }

  get email(): string {
    return this.data.email;
  }

  get username(): string | undefined {
    return this.data.username;
  }

  get handle(): string | undefined {
    return this.data.handle;
  }

  get firstName(): string {
    return this.data.first_name || '';
  }

  get lastName(): string {
    return this.data.last_name || '';
  }

  get isActive(): boolean {
    return this.data.is_active ?? true;
  }

  get isVerified(): boolean {
    return this.data.is_verified ?? false;
  }

  get isAdmin(): boolean {
    // This property doesn't exist in API, but may be added by app
    return (this.data as any).is_admin || false;
  }

  get credits(): number {
    // This property doesn't exist in API, but may be added by app
    return (this.data as any).credits || 0;
  }

  get createdAt(): string | undefined {
    return this.data.created_at;
  }

  get updatedAt(): string | undefined {
    return this.data.updated_at;
  }

  /**
   * Get display name with smart fallbacks.
   */
  getDisplayName(): string {
    // Try display_name from API first
    if (this.data.display_name) {
      return this.data.display_name;
    }

    // Try full name
    if (this.firstName || this.lastName) {
      return `${this.firstName} ${this.lastName}`.trim();
    }

    // Try handle
    if (this.handle) {
      return this.handle;
    }

    // Try username
    if (this.username) {
      return this.username;
    }

    // Fall back to email prefix
    return this.email.split('@')[0];
  }

  /**
   * Get initials for avatar display.
   */
  getInitials(): string {
    const displayName = this.getDisplayName();

    // If we have first and last name
    if (this.firstName && this.lastName) {
      return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
    }

    // Try to get from display name (might be username or email)
    const parts = displayName.split(/[\s._-]+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    // Single initial
    return displayName.substring(0, 2).toUpperCase();
  }

  /**
   * Parse and cache authentication providers from user data.
   */
  private parseProviders(): AuthProvider[] {
    if (this._providers) return this._providers;

    this._providers = [];

    // Parse GitHub provider
    if ((this.data as any).githubId || (this.data as any).github_id) {
      this._providers.push({
        type: 'github',
        id: (this.data as any).githubId || (this.data as any).github_id,
        username:
          (this.data as any).githubUsername ||
          (this.data as any).github_username,
        email:
          (this.data as any).githubEmail || (this.data as any).github_email,
        avatarUrl:
          (this.data as any).githubAvatarUrl ||
          (this.data as any).github_avatar_url,
        accessToken:
          (this.data as any).githubAccessToken ||
          (this.data as any).github_access_token,
        raw: (this.data as any).githubRaw || (this.data as any).github_raw,
      });
    }

    // Parse LinkedIn provider
    if ((this.data as any).linkedinId || (this.data as any).linkedin_id) {
      this._providers.push({
        type: 'linkedin',
        id: (this.data as any).linkedinId || (this.data as any).linkedin_id,
        email:
          (this.data as any).linkedinEmail || (this.data as any).linkedin_email,
        displayName:
          (this.data as any).linkedinDisplayName ||
          (this.data as any).linkedin_display_name,
        avatarUrl:
          (this.data as any).linkedinAvatarUrl ||
          (this.data as any).linkedin_avatar_url,
        accessToken:
          (this.data as any).linkedinAccessToken ||
          (this.data as any).linkedin_access_token,
        refreshToken:
          (this.data as any).linkedinRefreshToken ||
          (this.data as any).linkedin_refresh_token,
        raw: (this.data as any).linkedinRaw || (this.data as any).linkedin_raw,
      });
    }

    // Also check for providers array in data
    if (Array.isArray((this.data as any).providers)) {
      this._providers.push(...(this.data as any).providers);
    }

    return this._providers;
  }

  /**
   * Get all authentication providers.
   */
  getProviders(): AuthProvider[] {
    return this.parseProviders();
  }

  /**
   * Get a specific authentication provider.
   */
  getProvider(type: 'github' | 'linkedin'): AuthProvider | undefined {
    return this.parseProviders().find(p => p.type === type);
  }

  /**
   * Check if user has a specific provider linked.
   */
  hasProvider(type: 'github' | 'linkedin'): boolean {
    return this.parseProviders().some(p => p.type === type);
  }

  /**
   * Get GitHub user data if available.
   * Fetches from GitHub API if not cached.
   */
  async getGitHubUser(): Promise<GitHubUser | undefined> {
    // Return cached if available
    if (this._githubUser) return this._githubUser;

    // Return existing promise if fetch is in progress
    if (this._githubUserPromise) return this._githubUserPromise;

    // Start fetching
    this._githubUserPromise = this.fetchGitHubUser();
    const result = await this._githubUserPromise;
    this._githubUserPromise = undefined;

    return result;
  }

  /**
   * Internal method to fetch GitHub user data.
   */
  private async fetchGitHubUser(): Promise<GitHubUser | undefined> {
    const githubProvider = this.getProvider('github');
    if (!githubProvider || !githubProvider.username) {
      return undefined;
    }

    try {
      // This would use the IAMMixin's getGitHubUser method
      const githubData = await (this.sdk as any).getGitHubUser(
        githubProvider.username,
      );
      if (githubData) {
        this._githubUser = new GitHubUser(githubData, this.sdk);
        return this._githubUser;
      }
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error);
    }

    return undefined;
  }

  /**
   * Get avatar URL with smart fallbacks.
   */
  async getAvatarUrl(): Promise<string> {
    // Try GitHub avatar first
    const githubUser = await this.getGitHubUser();
    if (githubUser?.avatarUrl) {
      return githubUser.getAvatarUrl();
    }

    // Try other providers
    for (const provider of this.parseProviders()) {
      if (provider.avatarUrl) {
        return provider.avatarUrl;
      }
    }

    // Gravatar fallback
    const crypto = (globalThis as any).crypto;
    if (crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(this.email.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `https://www.gravatar.com/avatar/${hashHex}?d=identicon`;
    }

    // Ultimate fallback
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getDisplayName())}`;
  }

  /**
   * Check if user has sufficient credits.
   */
  hasCredits(amount: number): boolean {
    return this.credits >= amount;
  }

  /**
   * Check if this is the same user (by id or uid).
   */
  equals(other: User | string): boolean {
    if (typeof other === 'string') {
      return this.id === other || this.uid === other;
    }
    return this.id === other.id || (!!this.uid && this.uid === other.uid);
  }

  /**
   * Update user data.
   */
  update(data: Partial<ApiUser>): void {
    this.data = { ...this.data, ...data };
    // Clear caches
    this._providers = undefined;
    this._githubUser = undefined;
  }

  /**
   * Convert to plain JSON object.
   */
  toJSON(): ApiUser {
    return { ...this.data };
  }
}
