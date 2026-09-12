/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * How the Spacer API is reached.
 *
 * The origin, the `/api/spacer/v1` prefix and the caller's credential in one
 * place, as `api/evals/request` holds them for the AI Agents service.
 *
 * @module api/spacer/request
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** What every Spacer call needs to know. */
export interface SpacerClientOptions {
  /** The Spacer service origin, e.g. `https://prod1.datalayer.run`. */
  baseUrl?: string;
  /** The caller's IAM token. */
  token?: string;
}

export type SpacerQuery = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface SpacerRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: SpacerQuery;
  signal?: AbortSignal;
}

/** The Spacer origin, with no trailing slash. */
export const spacerOrigin = (baseUrl?: string): string =>
  String(baseUrl || DEFAULT_SERVICE_URLS.SPACER)
    .trim()
    .replace(/\/+$/, '');

/**
 * A full URL under `/api/spacer/v1`, with the query merged in. Empty, null
 * and undefined values are left out.
 */
export const spacerUrl = (
  options: SpacerClientOptions,
  path: string,
  query: SpacerQuery = {},
): string => {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value));
    }
  }
  const search = parameters.toString();
  return `${spacerOrigin(options.baseUrl)}${API_BASE_PATHS.SPACER}${path}${
    search ? `?${search}` : ''
  }`;
};

/** One request to Spacer, `path` relative to `/api/spacer/v1`. */
export const spacerRequest = <T>(
  options: SpacerClientOptions,
  path: string,
  init: SpacerRequestInit = {},
): Promise<T> =>
  requestDatalayerAPI<T>({
    url: spacerUrl(options, path, init.query),
    method: init.method ?? 'GET',
    body: init.body,
    token: options.token,
    signal: init.signal,
  });

/** A path segment, encoded once. */
export const spacerSegment = (value: string): string =>
  encodeURIComponent(String(value ?? '').trim());
