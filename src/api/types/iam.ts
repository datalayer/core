/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a user in the Datalayer platform
 * @interface User
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** Alternative unique identifier (UUID format) */
  uid?: string;
  /** User ID in the authentication system */
  user_id?: string;
  /** Username for login */
  username?: string;
  /** User's handle or nickname */
  handle?: string;
  /** User's email address */
  email: string;
  /** User's first name */
  first_name?: string;
  /** User's last name */
  last_name?: string;
  /** Display name shown in the UI */
  display_name?: string;
  /** URL to the user's avatar image */
  avatar_url?: string;
  /** Alternative property name for avatar URL (for backwards compatibility) */
  avatarUrl?: string;
  /** ISO 8601 timestamp of when the user was created */
  created_at?: string;
  /** ISO 8601 timestamp of when the user was last updated */
  updated_at?: string;
  /** Whether the user account is active */
  is_active?: boolean;
  /** Whether the user's email has been verified */
  is_verified?: boolean;
  /** Whether multi-factor authentication is enabled */
  mfa_enabled?: boolean;
}

/**
 * Request payload for user login
 * @interface LoginRequest
 */
export interface LoginRequest {
  /** Username for login (alternative to email) */
  username?: string;
  /** Email address for login (alternative to username) */
  email?: string;
  /** User's password */
  password: string;
  /** Multi-factor authentication code if MFA is enabled */
  mfa_code?: string;
}

/**
 * Response from a successful login request
 * @interface LoginResponse
 */
export interface LoginResponse {
  /** JWT access token for API authentication */
  access_token: string;
  /** JWT refresh token for obtaining new access tokens */
  refresh_token?: string;
  /** Token type (typically "Bearer") */
  token_type: string;
  /** Token expiration time in seconds */
  expires_in: number;
  /** User information for the authenticated user */
  user: User;
}

/**
 * Response from the /me endpoint containing current user information
 * @interface UserMeResponse
 */
export interface UserMeResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Current user's information */
  user: User;
}
