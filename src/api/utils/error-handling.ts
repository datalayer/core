/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiResponse } from '../base/client';

/**
 * Helper function to handle API responses with proper error handling and logging
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  operation: string,
  service: string,
  fallback?: T,
): Promise<ApiResponse<T>> {
  try {
    const response = await apiCall();

    // Check if response indicates success (for structured responses)
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data
    ) {
      const structuredResponse = response.data as any;
      if (!structuredResponse.success) {
        console.warn(
          `${service} API ${operation} returned success=false:`,
          structuredResponse.message || 'Unknown error',
        );
        if (fallback !== undefined) {
          return { ...response, data: fallback };
        }
      }
    }

    return response;
  } catch (error: any) {
    console.error(
      `${service} API ${operation} failed:`,
      error.message || error,
    );

    // If we have a fallback, return it instead of throwing
    if (fallback !== undefined) {
      console.warn(`Using fallback for ${service} ${operation}:`, fallback);
      return {
        data: fallback,
        status: error.status || 500,
        ok: false,
        headers: new Headers(),
      };
    }

    // Re-throw the error if no fallback
    throw error;
  }
}

/**
 * Convenience wrapper for IAM API calls
 */
export function handleIamApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  operation: string,
  fallback?: T,
): Promise<ApiResponse<T>> {
  return handleApiCall(apiCall, operation, 'IAM', fallback);
}

/**
 * Convenience wrapper for Runtimes API calls
 */
export function handleRuntimesApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  operation: string,
  fallback?: T,
): Promise<ApiResponse<T>> {
  return handleApiCall(apiCall, operation, 'Runtimes', fallback);
}

/**
 * Convenience wrapper for Spacer API calls
 */
export function handleSpacerApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  operation: string,
  fallback?: T,
): Promise<ApiResponse<T>> {
  return handleApiCall(apiCall, operation, 'Spacer', fallback);
}
