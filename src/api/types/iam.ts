/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a user in the Datalayer platform
 * @interface User
 */

export interface User {
  /** uuid for the user */
  id: string;
  /** ulid for the user */
  uid: string;
  /** User's handle or nickname */
  handle_s: string;
  /** User's email address */
  email_s: string;
  /** User's first name */
  first_name_t: string;
  /** User's last name */
  last_name_t: string;
  /** Display name shown in the UI */
  avatar_url_s: string;
  /** Additional fields that may be present in the response */
  [key: string]: any;
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
 * Response from the /me endpoint containing current user information
 * @interface UserMeResponse
 */
export interface UserMeResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message from the server */
  message: string;
  /** Current user's profile information */
  me: {
    /** Unique identifier (full ID) for the user */
    id: string;
    /** Unique identifier (UID) for the user */
    uid: string;
    /** User handle (username) */
    handle: string;
    /** Email address of the user (may be empty string) */
    email: string;
    /** First name of the user (may be empty string) */
    firstName: string;
    /** Last name of the user (may be empty string) */
    lastName: string;
    /** Avatar URL for the user (may be empty string) */
    avatarUrl: string;
    /** Array of roles assigned to the user */
    roles: string[];
    /** Allow additional fields that may come from the server */
    [key: string]: any;
  };
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
  profile: {
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
    /** User roles array */
    roles_ss?: string[];
    /** Avatar URL */
    avatar_url_s?: string;
    /** Onboarding state as JSON string */
    onboarding_s?: string;
    /** New password request timestamp */
    new_password_request_ts_dt?: string | null;
    /** New password confirmation timestamp */
    new_password_confirmation_ts_dt?: string | null;
    /** Customer UID */
    customer_uid?: string | null;
    /** Credits customer UID for billing */
    credits_customer_uid?: string | null;
    /** Email unsubscription status */
    unsubscribed_from_outbounds_b?: boolean;
    /** Linked contact UID */
    linked_contact_uid?: string | null;
    /** MFA URL */
    mfa_url_s?: string | null;
    /** MFA secret */
    mfa_secret_s?: string | null;
    /** Email verification token */
    email_token_s?: string | null;
    /** Pending email update */
    email_update_s?: string | null;
    /** IAM providers (nested structure - not typed in detail) */
    iam_providers?: any[];
    /** User settings (nested structure - not typed in detail) */
    settings?: any;
    /** User events (nested structure - not typed in detail) */
    events?: any[];
    /** Allow additional fields that may come from the server */
    [key: string]: any;
  };
}
