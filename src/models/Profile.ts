/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export type IProfileType = 'user' | 'organization' | undefined;

/**
 * Represents a user profile in the Datalayer platform
 * @interface Profile
 */

export interface Profile {
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
}

export default Profile;
