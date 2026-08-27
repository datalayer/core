/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The gateway seen by a platform administrator: its version and liveness,
 * the worker directory, the engine's health. No raw history, no secrets.
 *
 * @module api/mcp/operations
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpServiceUrl, mcpUrl } from './gateway';

export interface McpGatewayVersion {
  version: string;
  /** The MCP resource this gateway serves; what a token's `aud` must name. */
  resource: string;
}

export interface McpGatewayHealth {
  status: string;
  version: string;
}

export type McpWorkerState = 'starting' | 'running' | 'idle' | 'draining' | 'stopped';

/** One worker process of the directory, keyed by user and by sandbox binding. */
export interface McpWorker {
  uid: string;
  userUid: string;
  /** The `sb_…` binding whose sandbox this worker holds, when it holds one. */
  sandboxBindingUid?: string | null;
  replica: string;
  state: McpWorkerState;
  /** Tasks in `working`; a worker with one is never reaped. */
  workingTasks: number;
  startedAt: string;
  lastUsedAt?: string | null;
  version?: string | null;
}

export interface McpWorkerList {
  items: McpWorker[];
  /** The replica that answered. */
  replica?: string;
}

export interface McpWorkflowQueue {
  name: string;
  backlog: number;
  /** Seconds the oldest waiting workflow has waited. */
  oldestWaitSeconds?: number | null;
}

/** Engine health, queue backlog and worker versions. */
export interface McpWorkflowsHealth {
  engine: 'temporal' | 'dbos' | string;
  healthy: boolean;
  detail?: string | null;
  queues: McpWorkflowQueue[];
  workerVersions: Record<string, number>;
  checkedAt: string;
}

export const getGatewayVersion = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpGatewayVersion> =>
  requestDatalayerAPI<McpGatewayVersion>({
    url: mcpServiceUrl(baseUrl, '/version'),
    method: 'GET',
  });

export const getGatewayHealth = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpGatewayHealth> =>
  requestDatalayerAPI<McpGatewayHealth>({
    url: mcpServiceUrl(baseUrl, '/healthz'),
    method: 'GET',
  });

/** The worker directory across replicas; platform administrators only. */
export const listWorkers = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpWorkerList> =>
  fromWire<McpWorkerList>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/operations/workers'),
      method: 'GET',
      token,
    }),
  );

export const getWorkflowsHealth = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpWorkflowsHealth> =>
  fromWire<McpWorkflowsHealth>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/operations/workflows'),
      method: 'GET',
      token,
    }),
  );
