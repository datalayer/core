/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/iam/credits
 * @description Credits and usage API for managing user credits.
 *
 * Provides functionality to retrieve user's available credits, quota, and reservations.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/**
 * Credit information for a user.
 */
export interface CreditsInfo {
  /** Available credits */
  credits: number;
  /** Credit quota (null if unlimited) */
  quota: number | null;
  /** Last update timestamp */
  last_update: string;
}

/**
 * Credit reservation information.
 */
export interface CreditReservation {
  /** Reservation ID */
  id: string;
  /** Reserved credits */
  credits: number;
  /** Resource ID (e.g., runtime ID) */
  resource: string;
  /** Last update timestamp */
  last_update: string;
  /** Burning rate (credits per hour) for this reservation */
  burning_rate: number;
  /** Start date of the reservation */
  start_date: string;
}

/**
 * Response from the credits endpoint.
 */
export interface CreditsResponse {
  /** Operation success status */
  success: boolean;
  /** Credit information */
  credits: CreditsInfo;
  /** Active credit reservations */
  reservations: CreditReservation[];
}

/**
 * Get the current user's available credits and usage information.
 *
 * @param token - Authentication token
 * @param iamUrl - Optional IAM service URL (defaults to production)
 * @returns Promise with credits information
 *
 * @example
 * ```typescript
 * import { getCredits } from '@datalayer/core/api/iam';
 *
 * const creditsInfo = await getCredits(token);
 * console.log(`Available credits: ${creditsInfo.credits.credits}`);
 * console.log(`Quota: ${creditsInfo.credits.quota || 'unlimited'}`);
 * ```
 */
export async function getCredits(
  token: string,
  iamUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<CreditsResponse> {
  return requestDatalayerAPI<CreditsResponse>({
    url: `${iamUrl}${API_BASE_PATHS.IAM}usage/credits`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
