/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Core HTTP client for Datalayer API requests.
 * Handles authentication, error handling, and async redirects.
 *
 * @module api/DatalayerApi
 */

import { URLExt } from '@jupyterlab/coreutils';
import axios, { AxiosRequestConfig } from 'axios';
import { sleep } from '../utils/Sleep';

/**
 * Error wrapper for failed HTTP responses.
 * Includes response details, warnings, errors, and tracebacks.
 */
export class RunResponseError extends Error {
  /**
   * Creates a RunResponseError from a Response object.
   * Extracts error details from response JSON.
   *
   * @param response - The failed HTTP response
   * @returns Promise resolving to RunResponseError instance
   */
  static async create(response: Response): Promise<RunResponseError> {
    try {
      const data = await response.json();
      const { message, errors, warnings, traceback, exception } = data;
      if (traceback) {
        console.error(traceback);
      }
      const responseError = new RunResponseError(
        response,
        message ?? RunResponseError._defaultMessage(response),
        warnings,
        errors,
        exception,
        traceback ?? '',
      );
      return responseError;
    } catch (e) {
      console.debug(e);
      return new RunResponseError(response);
    }
  }

  /**
   * Create a new response error.
   */
  constructor(
    response: Response,
    message = RunResponseError._defaultMessage(response),
    warnings = undefined,
    errors = undefined,
    exceptionMessage = undefined,
    traceback = '',
  ) {
    super(message);
    this.name = 'RunResponseError';
    this.warnings = warnings ?? [];
    this.errors = errors ?? [];
    this.response = response;
    this.exceptionMessage = exceptionMessage;
    this.traceback = traceback;
  }

  /**
   * Warnings listed in the response.
   */
  readonly warnings: string[];

  /**
   * Errors listed in the response.
   */
  readonly errors: string[];

  /**
   * The response associated with the error.
   */
  readonly response: Response;

  /**
   * The exception associated with the error.
   */
  readonly exceptionMessage?: string;

  /**
   * The traceback associated with the error.
   */
  readonly traceback: string;

  private static _defaultMessage(response: Response): string {
    return `Invalid response: ${response.status} ${response.statusText}`;
  }
}

/**
 * Error wrapper for network failures.
 * Thrown when HTTP request fails due to connectivity issues.
 */
export class NetworkError extends TypeError {
  /**
   * Creates a NetworkError from the original TypeError.
   *
   * @param original - The original network error
   */
  constructor(original: TypeError) {
    super(original.message);
    this.name = 'NetworkError';
    this.stack = original.stack;
  }
}

/**
 * Options for Datalayer API requests.
 */
export interface IRequestDatalayerAPIOptions {
  /** Target URL for the request */
  url: string;
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method?: string;
  /** Request body (JSON object or FormData) */
  body?: any;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** JWT bearer token for authentication */
  token?: string;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Makes authenticated HTTP requests to Datalayer APIs.
 * Handles JSON and FormData, includes auth headers, and manages redirects.
 *
 * @param options - Request configuration
 * @returns Promise resolving to response data
 * @throws {NetworkError} On network failures
 * @throws {RunResponseError} On HTTP error responses
 *
 * @example
 * ```typescript
 * const data = await requestDatalayerAPI({
 *   url: 'https://api.datalayer.run/users',
 *   method: 'GET',
 *   token: 'eyJhbGc...'
 * });
 * ```
 */
export async function requestDatalayerAPI<T = any>({
  url,
  method,
  body,
  token,
  signal,
  headers = {},
}: IRequestDatalayerAPIOptions): Promise<T> {
  // Handle FormData differently from JSON
  const isFormData = body instanceof FormData;

  // Prepare axios config
  const axiosConfig: AxiosRequestConfig = {
    url,
    method: (method ?? 'GET') as any,
    headers: { ...headers },
    withCredentials: true, // equivalent to credentials: 'include'
    signal,
    // CORS mode is handled automatically by axios
    // Cache control headers
  };

  // Add cache control headers only for GET requests (equivalent to cache: 'no-store')
  if (method === 'GET' || !method) {
    if (!axiosConfig.headers!['Cache-Control']) {
      axiosConfig.headers!['Cache-Control'] =
        'no-store, no-cache, must-revalidate';
    }
    if (!axiosConfig.headers!['Pragma']) {
      axiosConfig.headers!['Pragma'] = 'no-cache';
    }
  }

  if (token) {
    axiosConfig.headers!['Authorization'] = `Bearer ${token}`;
  }

  if (isFormData) {
    // For FormData: let axios handle Content-Type automatically
    axiosConfig.data = body;
    // Don't set Content-Type - axios will set multipart/form-data with boundary
    if (!axiosConfig.headers!['Accept']) {
      axiosConfig.headers!['Accept'] = 'application/json';
    }
  } else {
    // For regular JSON requests
    if (!axiosConfig.headers!['Accept']) {
      axiosConfig.headers!['Accept'] = 'application/json';
    }
    if (!axiosConfig.headers!['Content-Type']) {
      axiosConfig.headers!['Content-Type'] = 'application/json';
    }
    axiosConfig.data = body;
  }

  try {
    const response = await axios(axiosConfig);

    // Handle redirections if needed
    if (response.status === 202 && response.headers.location) {
      return await handleAxiosRedirection(response, axiosConfig);
    }

    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Convert axios error to our RunResponseError format
        const mockResponse = {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
          json: async () => error.response?.data,
          text: async () => JSON.stringify(error.response?.data),
        } as Response;
        throw await RunResponseError.create(mockResponse);
      }
      throw new NetworkError(error);
    }
    throw error;
  }
}

async function handleAxiosRedirection(
  response: any,
  originalConfig: AxiosRequestConfig,
): Promise<any> {
  let redirect = response.headers.location;
  if (redirect) {
    const parsedURL = URLExt.parse(originalConfig.url!);
    const baseUrl = parsedURL.protocol + '//' + parsedURL.hostname;
    if (!redirect.startsWith(baseUrl)) {
      redirect = URLExt.join(baseUrl, redirect);
    }
  }

  let sleepTimeout = 1000;
  while (response.status === 202 && redirect) {
    await sleep(sleepTimeout);
    sleepTimeout *= 2;

    const redirectConfig: AxiosRequestConfig = {
      ...originalConfig,
      url: redirect,
      method: 'GET',
      data: undefined, // Don't send body on redirect
    };

    response = await axios(redirectConfig);
  }

  return response.data;
}
