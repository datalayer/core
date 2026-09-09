/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * How the evals API is reached.
 *
 * One place builds the AI Agents origin, the `/api/ai-agents/v1` prefix and
 * the account scope. The landings UI used to assemble those in three views;
 * a service origin that moves then broke three places, silently. Here it
 * is one, and the contract tests on both sides read this module's paths.
 *
 * Account scope: the service answers for the caller unless `account_uid`
 * names an organization or a team the caller belongs to, in which case the
 * evalsets are that account's. The option rides on every request.
 *
 * @module api/evals/request
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** What every evals call needs to know. */
export interface EvalsClientOptions {
  /** The AI Agents service origin, e.g. `https://prod1.datalayer.run`. */
  baseUrl?: string;
  /** The caller's IAM token; a public read may go without one. */
  token?: string;
  /** An organization or team uid to act for; the caller's own when absent. */
  accountUid?: string;
}

export type EvalsQuery = Record<
  string,
  string | number | boolean | undefined | null
>;

export type EvalsMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** The AI Agents origin, with no trailing slash. */
export const aiAgentsOrigin = (baseUrl?: string): string =>
  String(baseUrl || DEFAULT_SERVICE_URLS.AI_AGENTS)
    .trim()
    .replace(/\/+$/, '');

/**
 * A full URL under `/api/ai-agents/v1`, with the account scope and any
 * query merged in. Empty, null and undefined values are left out.
 */
export const aiAgentsUrl = (
  options: EvalsClientOptions,
  path: string,
  query: EvalsQuery = {},
): string => {
  const [pathname, inlineSearch = ''] = path.split('?');
  const parameters = new URLSearchParams(inlineSearch);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value));
    }
  }
  if (options.accountUid && !parameters.has('account_uid')) {
    parameters.set('account_uid', options.accountUid);
  }
  const search = parameters.toString();
  return `${aiAgentsOrigin(options.baseUrl)}${API_BASE_PATHS.AI_AGENTS}${pathname}${
    search ? `?${search}` : ''
  }`;
};

/** A URL under `/api/ai-agents/v1/evals`. */
export const evalsUrl = (
  options: EvalsClientOptions,
  suffix: string,
  query: EvalsQuery = {},
): string => aiAgentsUrl(options, `/evals${suffix}`, query);

export interface AiAgentsRequestInit {
  method?: EvalsMethod;
  body?: unknown;
  query?: EvalsQuery;
  signal?: AbortSignal;
}

/**
 * One request to the AI Agents service, `path` relative to `/api/ai-agents/v1`.
 *
 * The typed functions in `client.ts` are built on this; a view that needs a
 * path the client does not name yet may call it directly, and the contract
 * spec still sees the path.
 */
export const aiAgentsRequest = <T>(
  options: EvalsClientOptions,
  path: string,
  init: AiAgentsRequestInit = {},
): Promise<T> =>
  requestDatalayerAPI<T>({
    url: aiAgentsUrl(options, path, init.query),
    method: init.method ?? 'GET',
    body: init.body,
    token: options.token,
    signal: init.signal,
  });

/** One request under `/evals`. */
export const evalsRequest = <T>(
  options: EvalsClientOptions,
  suffix: string,
  init: AiAgentsRequestInit = {},
): Promise<T> => aiAgentsRequest<T>(options, `/evals${suffix}`, init);

/** A path segment, encoded once. */
export const segment = (value: string): string =>
  encodeURIComponent(String(value ?? '').trim());
