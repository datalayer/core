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
 * Thrown when `fetch` could not reach the server at all.
 */
export class NetworkError extends TypeError {
  /**
   * Creates a NetworkError from the error `fetch` rejected with.
   *
   * @param original - The original network error
   */
  constructor(original: Error) {
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
 * How the response body is read.
 *
 * `json` (the default) parses the body as JSON and falls back to the text
 * when it does not parse, so an empty body or a plain-text answer still
 * arrives as data rather than an error. `stream` hands back the body's
 * `ReadableStream` unread.
 */
export type DatalayerAPIResponseType =
  | 'json'
  | 'text'
  | 'blob'
  | 'arraybuffer'
  | 'stream';

/**
 * Options for Datalayer API requests.
 */
export interface IRequestDatalayerAPIOptions {
  /** Target URL for the request */
  url: string;
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method?: string;
  /** Request body (JSON object, FormData, string, or raw bytes) */
  body?: any;
  /** Custom HTTP headers */
  headers?: Record<string, string>;
  /** JWT bearer token for authentication */
  token?: string;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** How to read the body; `json` when omitted. */
  responseType?: DatalayerAPIResponseType;
}

export interface IDatalayerAPIResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Bodies `fetch` sends as they are. Everything else is a JSON value and is
 * stringified.
 */
function isRawBody(body: unknown): boolean {
  return (
    typeof body === 'string' ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof URLSearchParams !== 'undefined' &&
      body instanceof URLSearchParams) ||
    (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
  );
}

/**
 * The response headers as a plain record, keyed in lower case the way
 * `Headers` reports them.
 */
function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, name) => {
    record[name] = value;
  });
  return record;
}

/**
 * Reads the body the way `responseType` asks for.
 */
async function readBody(
  response: Response,
  responseType: DatalayerAPIResponseType | undefined,
): Promise<unknown> {
  switch (responseType) {
    case 'text':
      return response.text();
    case 'blob':
      return response.blob();
    case 'arraybuffer':
      return response.arrayBuffer();
    case 'stream':
      return response.body;
    default: {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
}

/**
 * Sends one request and returns the response when the server accepted it.
 *
 * A failure to reach the server at all arrives as `NetworkError`; an abort
 * through the caller's signal is rethrown as it came, since the caller asked
 * for it. A non-2xx answer becomes `TokenExpiredError` when a 401 is explained
 * by the token we sent, and `RunResponseError` otherwise.
 */
async function send(
  url: string,
  init: RequestInit,
  token: string | undefined,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    // By name: a DOMException is not an `Error` in every realm.
    if ((error as { name?: unknown } | null)?.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError(
      error instanceof Error ? error : new TypeError(String(error)),
    );
  }
  if (!response.ok) {
    throwIfTokenExpired(response.status, token, url);
    throw await RunResponseError.create(response);
  }
  return response;
}

/**
 * Makes authenticated HTTP requests to Datalayer APIs.
 * Handles JSON and FormData, includes auth headers, and manages redirects.
 *
 * @param options - Request configuration
 * @returns Promise resolving to response data
 * @throws {NetworkError} On network failures
 * @throws {RunResponseError} On HTTP error responses
 * @throws {TokenExpiredError} On a 401 explained by an expired token
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
  const requestMethod = method ?? 'GET';
  const requestHeaders = new Headers(headers);

  // A GET must not be answered from a cache (the equivalent of
  // `cache: 'no-store'`, said in headers so proxies hear it too).
  if (requestMethod === 'GET') {
    if (!requestHeaders.has('Cache-Control')) {
      requestHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    if (!requestHeaders.has('Pragma')) {
      requestHeaders.set('Pragma', 'no-cache');
    }
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json');
  }

  let requestBody: BodyInit | undefined;
  if (isFormDataBody(body)) {
    // No Content-Type: the browser sets multipart/form-data with its
    // boundary.
    requestBody = body;
  } else {
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    if (body === undefined) {
      requestBody = undefined;
    } else if (isRawBody(body)) {
      requestBody = body as BodyInit;
    } else {
      requestBody = JSON.stringify(body);
    }
  }

  const init: RequestInit = {
    method: requestMethod,
    headers: requestHeaders,
    body: requestBody,
    // Sends the browser's cookies along, cross-origin included.
    credentials: 'include',
    signal,
  };

  let response = await send(url, init, token);

  // A 202 with a Location is the server saying the work is still running
  // there: poll it until it is done.
  if (response.status === 202 && response.headers.get('location')) {
    response = await followAsyncRedirect(response, init, url, token);
  }

  return {
    data: (await readBody(response, responseType)) as T,
    status: response.status,
    statusText: response.statusText,
    headers: headersToRecord(response.headers),
  };
}

export async function requestDatalayerAPI<T = any>(
  options: IRequestDatalayerAPIOptions,
): Promise<T> {
  return (await requestDatalayerAPIWithResponse<T>(options)).data;
}

/**
 * Resolves the Location of a 202 against the request's URL.
 *
 * A proxy that emits an http Location for the same host while the original
 * request was https gets it forced back to https, since the browser would
 * refuse the mixed content and report it as a CORS or network failure.
 */
function resolveLocation(location: string, baseUrl: string): string {
  const normalized = location.replace(/^([a-z][a-z0-9+.-]*):\/(?!\/)/i, '$1://');
  try {
    const resolved = new URL(normalized, baseUrl);
    const base = new URL(
      baseUrl,
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );
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
    return resolved.toString();
  } catch {
    const parsedURL = URLExt.parse(baseUrl);
    const fallbackBase = parsedURL.protocol + '//' + parsedURL.hostname;
    return URLExt.join(fallbackBase, normalized);
  }
}

/**
 * Polls the Location of a 202 with GETs, backing off from a second and
 * doubling, until the answer is no longer a 202. The polls carry the
 * original headers and credentials, never the body.
 */
async function followAsyncRedirect(
  response: Response,
  init: RequestInit,
  url: string,
  token: string | undefined,
): Promise<Response> {
  const location = resolveLocation(response.headers.get('location')!, url);
  const pollInit: RequestInit = { ...init, method: 'GET', body: undefined };
  let sleepTimeout = 1000;
  while (response.status === 202) {
    await sleep(sleepTimeout);
    sleepTimeout *= 2;
    response = await send(location, pollInit, token);
  }
  return response;
}
