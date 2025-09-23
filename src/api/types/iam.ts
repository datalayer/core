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
 *
 * Must provide either:
 * - handle + password for credential-based authentication
 * - token for token-based authentication
 *
 * Both methods cannot be used simultaneously.
 */
export interface LoginRequest {
  /** User handle (username/email) for credential-based authentication */
  handle?: string;
  /** User's password for credential-based authentication */
  password?: string;
  /** Authentication token for token-based authentication */
  token?: string;
}

/**
 * Response from a successful login request
 * @interface LoginResponse
 */
export interface LoginResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** User information for the authenticated user */
  user: {
    /** ISO 8601 timestamp of when the user was created */
    creation_ts_dt: string;
    /** Unique identifier for the user */
    id: string;
    /** ISO 8601 timestamp of when the user requested to join */
    join_request_ts_dt: string;
    /** ISO 8601 timestamp of when the user joined */
    join_ts_dt: string;
    /** ISO 8601 timestamp of when the user was last updated */
    last_update_ts_dt: string;
    /** Origin of the user account */
    origin_s: string;
    /** Type of the entity */
    type_s: string;
    /** Alternative unique identifier (UUID format) */
    uid: string;
    /** User's email address */
    email_s: string;
    /** User's first name */
    first_name_t: string;
    /** User's handle or identifier */
    handle_s: string;
    /** User's last name */
    last_name_t: string;
    /** Additional fields that may be present in the response */
    [key: string]: any;
  };
  /** JWT token for API authentication */
  token: string;
}

/**
 * User profile information from the /me endpoint
 * @interface MeUser
 */
export interface MeUser {
  /** Unique identifier (full ID) for the user */
  id: string;
  /** Unique identifier (UID) for the user */
  uid: string;
  /** User handle (username) */
  handle: string;
  /** Email address of the user */
  email: string;
  /** First name of the user */
  firstName: string;
  /** Last name of the user */
  lastName: string;
  /** Avatar URL for the user */
  avatarUrl: string;
  /** Array of roles assigned to the user */
  roles: string[];
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
  /** Current user's profile information */
  me: MeUser;
}

/**
 * User profile information from the /whoami endpoint
 * @interface WhoAmIProfile
 */
export interface WhoAmIProfile {
  /** ISO 8601 timestamp of when the user was created */
  creation_ts_dt: string;
  /** Unique identifier for the user */
  id: string;
  /** ISO 8601 timestamp of when the user requested to join */
  join_request_ts_dt: string | null;
  /** ISO 8601 timestamp of when the user joined */
  join_ts_dt: string;
  /** ISO 8601 timestamp of last update */
  last_update_ts_dt: string;
  /** Origin of the user account */
  origin_s: string;
  /** Type of the record */
  type_s: string;
  /** User ID */
  uid: string;
  /** Email address */
  email_s: string;
  /** First name */
  first_name_t: string;
  /** User handle */
  handle_s: string;
  /** Last name */
  last_name_t: string;
}

/**
 * Response from the /whoami endpoint
 * @interface WhoAmIResponse
 */
export interface WhoAmIResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** User profile information */
  profile: WhoAmIProfile;
}

/**
 * Response from the health check ping endpoint
 * @interface HealthzPingResponse
 */
export interface HealthzPingResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Service status information */
  status: {
    /** Status indicator (e.g., "OK") */
    status: string;
  };
  /** API version */
  version: string;
}
