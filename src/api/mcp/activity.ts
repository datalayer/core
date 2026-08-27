/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * "What is going on" for the caller, in one answer: the connected clients
 * joined with their last call, the bound sandboxes with their state, the
 * tasks in `working`/`input_required`, the last calls and today's counts.
 *
 * Read from `mcp-gateway`, `mcp-tasks` and `mcp-audit` with bounded
 * queries, cached for five seconds per caller. An owner adds `?org=`.
 *
 * @module api/mcp/activity
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpUrl } from './gateway';
import type { McpAuditEvent } from '../../models/McpAuditEvent';
import type { McpBinding } from '../../models/McpBinding';
import type { McpTask } from '../../models/McpTask';

/** A connected client, as the dashboard shows it, with its last call. */
export interface McpActiveClient {
  clientId: string;
  clientName?: string | null;
  /** The IAM grant behind the connection, what **Disconnect** revokes. */
  grantUid?: string | null;
  scopes?: string[];
  connectedAt?: string | null;
  lastCall?: McpAuditEvent | null;
}

/** Today's counts for the caller, or for the organization. */
export interface McpActivityCounts {
  calls: number;
  refusals: number;
  tasks: number;
  /** Credits spent by agents today. */
  credits: number;
}

export interface McpActivity {
  /** The moment the answer was assembled; the cache is five seconds. */
  at: string;
  orgUid?: string | null;
  clients: McpActiveClient[];
  sandboxes: McpBinding[];
  tasks: McpTask[];
  calls: McpAuditEvent[];
  today: McpActivityCounts;
}

export interface McpActivityFilters {
  /** An owner's view of an organization. */
  org?: string;
  team?: string;
}

export const getMcpActivity = async (
  token: string,
  filters: McpActivityFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpActivity> =>
  fromWire<McpActivity>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/activity', { ...filters }),
      method: 'GET',
      token,
    }),
  );
