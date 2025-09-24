/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { URLExt } from '@jupyterlab/coreutils';
import axios, { AxiosRequestConfig } from 'axios';
import { sleep } from '../utils/Sleep';

/**
 * A wrapped error for a fetch response.
 */
export class RunResponseError extends Error {
  /**
   * Create a RunResponseError from a response,
   * handling the traceback and message as appropriate.
   *
   * @param response The response object.
   *
   * @returns A promise that resolves with a `RunResponseError` object.
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
 * A wrapped error for a network error.
 */
export class NetworkError extends TypeError {
  /**
   * Create a new network error.
   */
  constructor(original: TypeError) {
    super(original.message);
    this.name = 'NetworkError';
    this.stack = original.stack;
  }
}

export interface IRequestDatalayerAPIOptions {
  /**
   * URL to request
   */
  url: string;
  /**
   * HTTP method
   */
  method?: string;
  /**
   * JSON-serializable object or FormData
   */
  body?: any;
  /**
   * Headers
   */
  headers?: Record<string, string>;
  /**
   * Authorization bearer token
   */
  token?: string;
  /**
   * Request abort signal.
   */
  signal?: AbortSignal;
}

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
