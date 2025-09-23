/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { URLExt } from '@jupyterlab/coreutils';
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
   * JSON-serializable object
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
  const headers_ = new Headers(headers);
  if (!headers_.has('Accept')) {
    headers_.set('Accept', 'application/json');
  }
  if (!headers_.has('Content-Type')) {
    headers_.set('Content-Type', 'application/json');
  }
  if (token) {
    headers_.set('Authorization', `Bearer ${token}`);
  }
  //  headers_.set('Origin', currentUri());
  let response: Response;
  try {
    response = await fetch(url, {
      method: method ?? 'GET',
      headers: headers_,
      body: body ? JSON.stringify(body) : undefined,
      // credentials: token ? 'include' : 'omit',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    throw new NetworkError(error as TypeError);
  }
  if (response.ok) {
    response = await wait_for_redirection(response, url, headers_);
    const content = await response.text();
    return (content ? JSON.parse(content) : null) as T;
  } else {
    throw await RunResponseError.create(response);
  }
}

async function wait_for_redirection(
  response: Response,
  url: string,
  headers_: Headers,
) {
  let redirect = response.headers.get('Location');
  if (redirect) {
    const parsedURL = URLExt.parse(url);
    const baseUrl = parsedURL.protocol + '//' + parsedURL.hostname;
    if (!redirect.startsWith(baseUrl)) {
      redirect = URLExt.join(baseUrl, redirect);
    }
  }
  let sleepTimeout = 1000;
  while (response.status === 202 && redirect) {
    await sleep(sleepTimeout);
    sleepTimeout *= 2;
    response = await fetch(redirect, {
      method: 'GET',
      headers: headers_,
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw await RunResponseError.create(response);
    }
  }
  return response;
}
