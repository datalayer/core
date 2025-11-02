/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a user in the Datalayer platform
 * @interface UserDTO
 */
export interface UserDTO {
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

export default UserDTO;
