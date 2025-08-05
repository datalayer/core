/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const BACKWARDS_COMPATIBLE_KERNEL_TYPES_MAP = {
  // Backwards compatible mapping.
  'default': 'notebook' as IRuntimeType,
  'snippet': 'cell' as IRuntimeType,
  'notebook': 'notebook' as IRuntimeType,
  'cell': 'cell' as IRuntimeType,
}

/**
 * Runtime type.
 *
 * TODO refactor with type { RuntimeLocation }
 */
export type IRuntimeType = 
  | 'notebook'
  | 'cell'
  ;

/**
 * Runtime optional capabilities.
 */
export type IRuntimeCapabilities = 'user_storage';

/**
 * User Kernel Jupyter server metadata
 */
export interface IRuntimePod {
  /**
   * Environment display name
   */
  environment_title: string;
  /**
   * Environment name
   */
  environment_name: string;
  /**
   * Runtime name
   */
  pod_name: string;
  /**
   * Runtime ingress URL
   */
  ingress: string;
  /**
   * Runtime user given name
   */
  given_name: string;
  /**
   * Runtime type
   */
  type: IRuntimeType;
  /**
   * Server authentication token
   */
  token: string;
  /**
   * Credits burning rate per second
   */
  burning_rate: number;
  /**
   * Kernel reservation ID
   */
  reservation_id?: string;
  /**
   * Runtime usage starting timestamp
   */
  started_at: string;
  /**
   * Runtime credits reservation expiration timestamp
   */
  expired_at?: string;
}
