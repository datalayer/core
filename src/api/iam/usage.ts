/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Credits and usage API for managing user credits.
 *
 * Provides functionality to retrieve user's available credits, quota, and reservations.
 *
 * @module api/iam/credits
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { CreditsResponse } from '../../models/CreditsDTO';

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
