/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The folders mounted into a Runtime that is already running.
 *
 * A Pod's volumes are fixed when it is created, so for most of a sandbox's
 * life its mounts were decided before it existed. The mount gateway lifts
 * that for the Home Folder: the platform binds a folder into a running pod
 * and the sandbox sees it at `/home/jovyan/{handle}` within a second or two,
 * with no restart.
 *
 * Not every Runtime can take one — a pod created before the gateway cannot,
 * and neither can a sandbox at an external provider — which is why a Runtime
 * carries `mountGateway` and why attaching answers with a reason rather than
 * appearing to work. The folders themselves are never named here: they are
 * resolved from the caller's memberships by the platform, and a client naming
 * one is not a way to mount it.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';

/** One folder bound into a running Runtime. */
export type RuntimeMount = {
  /** The single path segment it appears under, and the account's handle. */
  target: string;
  /** Where it comes from on the shared filesystem. Informational. */
  source: string;
  mode: 'ro' | 'rw';
  allowExec: boolean;
  uid?: string;
  kind?: string;
};

/** What the platform reports about a Runtime's mounts. */
export type RuntimeMounts = {
  success: boolean;
  message: string;
  /**
   * `ready` when everything asked for is mounted, `degraded` when some of it
   * is, `failed` or `GATEWAY_NOT_READY` when none of it is yet.
   */
  state: string;
  /** What has been granted. */
  mounts: RuntimeMount[];
  /** Of those, what has actually arrived in the sandbox. */
  mounted: string[];
  /** Those that could not be mounted, by target, with the reason. */
  failed: Record<string, string>;
};

const convert = (value: unknown): RuntimeMounts => {
  const converted = contentsToCamelCase(value as JsonValue) as unknown as RuntimeMounts;
  return {
    ...converted,
    mounts: converted.mounts ?? [],
    mounted: converted.mounted ?? [],
    failed: converted.failed ?? {},
  };
};

const runtimesUrl = (baseUrl: string, suffix: string): string =>
  `${baseUrl}${API_BASE_PATHS.RUNTIMES}${suffix}`;

/** What this Runtime is granted, and what has arrived. */
export const getRuntimeMounts = async (
  token: string,
  runtimeName: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<RuntimeMounts> =>
  convert(
    await requestDatalayerAPI({
      url: runtimesUrl(baseUrl, `/runtimes/${encodeURIComponent(runtimeName)}/mounts`),
      method: 'GET',
      token,
    }),
  );

/**
 * Mount the caller's home folders into a Runtime that is already running.
 *
 * Which folders is not a parameter: the platform resolves the caller's own
 * memberships and mounts those.
 */
export const attachRuntimeMounts = async (
  token: string,
  runtimeName: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<RuntimeMounts> =>
  convert(
    await requestDatalayerAPI({
      url: runtimesUrl(baseUrl, `/runtimes/${encodeURIComponent(runtimeName)}/mounts`),
      method: 'POST',
      token,
      body: {},
    }),
  );

/** Take one folder out of a running Runtime, by the name it appears under. */
export const detachRuntimeMount = async (
  token: string,
  runtimeName: string,
  target: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.RUNTIMES,
): Promise<RuntimeMounts> =>
  convert(
    await requestDatalayerAPI({
      url: runtimesUrl(
        baseUrl,
        `/runtimes/${encodeURIComponent(runtimeName)}/mounts/${encodeURIComponent(target)}`,
      ),
      method: 'DELETE',
      token,
    }),
  );

/** Whether the platform has finished applying what was asked for. */
export const isRuntimeMountsSettled = (mounts?: RuntimeMounts): boolean =>
  mounts ? mounts.state === 'ready' || mounts.state === 'degraded' : false;
