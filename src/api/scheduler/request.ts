/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * How the Scheduler API is reached.
 *
 * The origin, the `/api/scheduler/v1` prefix and the caller's credential in
 * one place, as `api/evals/request` holds them for the AI Agents service.
 *
 * @module api/scheduler/request
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** What every Scheduler call needs to know. */
export interface SchedulerClientOptions {
  /** The Scheduler service origin, e.g. `https://prod1.datalayer.run`. */
  baseUrl?: string;
  /** The caller's IAM token. */
  token?: string;
}

export type SchedulerQuery = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface SchedulerRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: SchedulerQuery;
  signal?: AbortSignal;
}

/** The Scheduler origin, with no trailing slash. */
export const schedulerOrigin = (baseUrl?: string): string =>
  String(baseUrl || DEFAULT_SERVICE_URLS.SCHEDULER)
    .trim()
    .replace(/\/+$/, '');

/**
 * A full URL under `/api/scheduler/v1`, with the query merged in. Empty,
 * null and undefined values are left out.
 */
export const schedulerUrl = (
  options: SchedulerClientOptions,
  path: string,
  query: SchedulerQuery = {},
): string => {
  const [pathname, inlineSearch = ''] = path.split('?');
  const parameters = new URLSearchParams(inlineSearch);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value));
    }
  }
  const search = parameters.toString();
  return `${schedulerOrigin(options.baseUrl)}${API_BASE_PATHS.SCHEDULER}${pathname}${
    search ? `?${search}` : ''
  }`;
};

/**
 * One request to the Scheduler service, `path` relative to
 * `/api/scheduler/v1`.
 */
export const schedulerRequest = <T>(
  options: SchedulerClientOptions,
  path: string,
  init: SchedulerRequestInit = {},
): Promise<T> =>
  requestDatalayerAPI<T>({
    url: schedulerUrl(options, path, init.query),
    method: init.method ?? 'GET',
    body: init.body,
    token: options.token,
    signal: init.signal,
  });

/** A path segment, encoded once. */
export const scheduleSegment = (value: string): string =>
  encodeURIComponent(String(value ?? '').trim());
