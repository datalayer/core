/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

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

/** One periodic job on the replica that answered. */
export interface McpJob {
  job: string;
  /** Ticks this replica actually ran. */
  ran: number;
  /**
   * Ticks this replica skipped because another held the lease. The ordinary
   * outcome on every replica but one — read it per replica, never summed.
   * Rising on *all* of them at once is the lease store refusing everybody.
   */
  skipped: number;
  failed: number;
  lastRanAt?: number | null;
  lastError?: string;
  lastDurationSeconds?: number;
  healthy: boolean;
}

export interface McpJobSchedule {
  /** Whether this replica's scheduler loops are running. */
  running: boolean;
  /** The replica that answered; the counts below are only about it. */
  holder: string;
  jobs: McpJob[];
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

/**
 * The periodic work on the replica that answers, and what it has done.
 *
 * Per replica by construction: only one replica holds each job's lease at a
 * time, so `ran` on one and `skipped` on the others is the scheduler working.
 * A caller that wants the platform's view has to ask every replica — there is
 * no aggregate here, because an aggregate would hide the case worth seeing,
 * which is every replica skipping at once.
 */
export const getJobSchedule = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpJobSchedule> =>
  fromWire<McpJobSchedule>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/operations/jobs'),
      method: 'GET',
      token,
    }),
  );
