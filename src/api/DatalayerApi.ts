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
import { getJwtExpiryMs, isJwtExpired } from '../utils/Jwt';

function isFormDataBody(body: unknown): body is FormData {
  if (!body || typeof body !== 'object') {
    return false;
  }

  // `instanceof FormData` is not reliable across realms (e.g. jsdom/undici).
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return true;
  }

  const formDataTag = Object.prototype.toString.call(body);
  if (formDataTag === '[object FormData]') {
    return true;
  }

  const candidate = body as {
    append?: unknown;
    get?: unknown;
    has?: unknown;
    entries?: unknown;
  };
  return (
    typeof candidate.append === 'function' &&
    typeof candidate.get === 'function' &&
    typeof candidate.has === 'function' &&
    typeof candidate.entries === 'function'
  );
}

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
      const { message, errors, warnings, traceback, exception, detail } = data;
      const resolvedMessage =
        message ??
        (typeof detail === 'string'
          ? detail
          : detail && typeof detail === 'object' && 'message' in detail
            ? String((detail as any).message)
            : undefined);
      if (traceback) {
        console.error(traceback);
      }
      const responseError = new RunResponseError(
        response,
        resolvedMessage ?? RunResponseError._defaultMessage(response),
        warnings,
        errors,
        exception,
        traceback ?? '',
        detail,
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
    detail: unknown = undefined,
  ) {
    super(message);
    this.name = 'RunResponseError';
    this.warnings = warnings ?? [];
    this.errors = errors ?? [];
    this.response = response;
    this.exceptionMessage = exceptionMessage;
    this.traceback = traceback;
    this.detail = detail;
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

  /**
   * Optional structured backend detail payload.
   */
  readonly detail: unknown;

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
 * Thrown when a request is made with a JWT that has already expired.
 *
 * Raised in place of the `RunResponseError` a 401 would otherwise produce,
 * and only when the token we sent says it has expired. That distinction is
 * the point of the class: a 401 can mean a dozen things — a revoked token, a
 * wrong audience, a permission the account never had — and none of them are
 * fixed by the same action. An expired token has exactly one remedy, and a
 * caller that can recognise it can offer that remedy instead of an error.
 *
 * Callers are expected to catch this by name:
 *
 * ```typescript
 * try {
 *   await requestDatalayerAPI({ url, token });
 * } catch (error) {
 *   if (error instanceof TokenExpiredError) {
 *     showSignIn();
 *     return;
 *   }
 *   throw error;
 * }
 * ```
 */
export class TokenExpiredError extends Error {
  /** When the token expired, in milliseconds since the epoch. */
  readonly expiredAt: number;

  /** The URL the request was going to, for context in logs. */
  readonly url: string;

  constructor(url: string, expiredAt: number) {
    super(
      `The Datalayer token expired at ${new Date(expiredAt).toISOString()}; ` +
        `not sending the request to ${url}.`,
    );
    // `name` rather than only the prototype, because a bundler that downlevels
    // this class can break `instanceof` across package boundaries and a name
    // check is the fallback every caller can still make.
    this.name = 'TokenExpiredError';
    this.expiredAt = expiredAt;
    this.url = url;
    // Restores the prototype chain when compiled down to ES5, without which
    // `instanceof TokenExpiredError` is false — see TypeScript #13965.
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

/**
 * Turn a 401 into a `TokenExpiredError` when the token is the reason for it.
 *
 * After the fact rather than before it. Checking the token up front would
 * have meant deciding, at the door, which endpoints require one — and plenty
 * here accept anonymous callers, so a pre-flight refusal would reject
 * requests that were going to succeed. The server is the only thing that
 * knows whether a given endpoint wanted credentials, and a 401 is it saying
 * so.
 *
 * Asked only on a 401, and only when we actually hold a token that says it
 * has expired. Every other 401 — a revoked token, a wrong audience, a
 * permission the account never had, an anonymous call to a protected route —
 * stays a `RunResponseError`, because those are not fixed by signing in
 * again and should not be dressed up as though they were.
 *
 * Reading `exp` after the response has come back is also the more reliable
 * moment: time has only moved forward, so a token the server judged expired
 * reads as expired here too, with no clock-skew allowance to tune.
 */
function throwIfTokenExpired(
  status: number,
  token: string | undefined,
  url: string,
): void {
  if (status !== 401 || !token || !isJwtExpired(token)) {
    return;
  }
  throw new TokenExpiredError(url, getJwtExpiryMs(token) ?? Date.now());
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
  /** Axios response representation for binary or streaming transports. */
  responseType?: AxiosRequestConfig['responseType'];
}

export interface IDatalayerAPIResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
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
export async function requestDatalayerAPIWithResponse<T = any>({
  url,
  method,
  body,
  token,
  signal,
  responseType,
  headers = {},
}: IRequestDatalayerAPIOptions): Promise<IDatalayerAPIResponse<T>> {
  // Handle FormData differently from JSON
  const isFormData = isFormDataBody(body);

  // Prepare axios config
  const axiosConfig: AxiosRequestConfig = {
    url,
    method: (method ?? 'GET') as any,
    headers: { ...headers },
    withCredentials: true, // equivalent to credentials: 'include'
    signal,
    responseType,
    // CORS mode is handled automatically by axios
    // Cache control headers
  };

  // In Vitest+jsdom, axios may pick the XHR adapter and fail with browser-like
  // network restrictions. Force the fetch adapter for integration reliability.
  if (typeof process !== 'undefined' && process.env.VITEST) {
    (axiosConfig as any).adapter = 'fetch';
  }

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

    if (response.status < 300) {
      // Handle redirections if needed.
      if (response.status === 202 && response.headers.location) {
        const data = await handleAxiosRedirection(response, axiosConfig);
        return {
          data: data as T,
          status: response.status,
          statusText: response.statusText,
          headers: { ...response.headers } as Record<string, string>,
        };
      }
    } else {
      throwIfTokenExpired(response.status, token, url);
      const adaptedResponse = {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        json: async () => response?.data,
        text: async () => JSON.stringify(response?.data),
      } as Response;
      throw await RunResponseError.create(adaptedResponse);
    }

    return {
      data: response.data as T,
      status: response.status,
      statusText: response.statusText,
      headers: { ...response.headers } as Record<string, string>,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throwIfTokenExpired(error.response.status, token, url);
        // Convert axios error to our RunResponseError format
        const adaptedResponse = {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
          json: async () => error.response?.data,
          text: async () => JSON.stringify(error.response?.data),
        } as Response;
        throw await RunResponseError.create(adaptedResponse);
      }
      throw new NetworkError(error);
    }
    throw error;
  }
}

export async function requestDatalayerAPI<T = any>(
  options: IRequestDatalayerAPIOptions,
): Promise<T> {
  return (await requestDatalayerAPIWithResponse<T>(options)).data;
}

async function handleAxiosRedirection(
  response: any,
  originalConfig: AxiosRequestConfig,
): Promise<any> {
  let redirect = response.headers.location;
  if (redirect) {
    const baseUrl = originalConfig.url ?? '';
    const normalizedRedirect = String(redirect).replace(
      /^([a-z][a-z0-9+.-]*):\/(?!\/)/i,
      '$1://',
    );

    try {
      const resolved = new URL(normalizedRedirect, baseUrl);
      const base = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : undefined);

      // If a proxy emits an http Location for the same host while the
      // original request is https, force https to avoid mixed-content errors
      // that browsers often report as CORS/network failures.
      if (
        base.protocol === 'https:' &&
        resolved.protocol === 'http:' &&
        resolved.hostname === base.hostname
      ) {
        resolved.protocol = 'https:';
        if (resolved.port === '80') {
          resolved.port = '';
        }
      }

      redirect = resolved.toString();
    } catch {
      const parsedURL = URLExt.parse(baseUrl);
      const fallbackBase = parsedURL.protocol + '//' + parsedURL.hostname;
      redirect = URLExt.join(fallbackBase, normalizedRedirect);
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
