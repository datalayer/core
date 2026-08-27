/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The audit log of the Jupyter MCP Server, for `organization_security_auditor`s
 * and owners: cursor-paged, exportable as JSONL or CSV.
 *
 * @module api/mcp/audit
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpUrl } from './gateway';
import type {
  McpAuditDecision,
  McpAuditEventList,
  McpAuditExportFormat,
  McpAuditOutcome,
} from '../../models/McpAuditEvent';

export type {
  McpAuditDecision,
  McpAuditEvent,
  McpAuditEventList,
  McpAuditExportFormat,
  McpAuditOutcome,
  McpClientInfo,
} from '../../models/McpAuditEvent';

export interface McpAuditFilters {
  org?: string;
  team?: string;
  /** The `client_id` of the agent, or a service agent's uid. */
  agent?: string;
  user?: string;
  tool?: string;
  method?: string;
  decision?: McpAuditDecision;
  outcome?: McpAuditOutcome;
  /** ISO 8601, UTC. */
  since?: string;
  until?: string;
  taskId?: string;
  traceId?: string;
  cursor?: string;
  limit?: number;
}

const auditQuery = (filters: McpAuditFilters) => ({
  org: filters.org,
  team: filters.team,
  agent: filters.agent,
  user: filters.user,
  tool: filters.tool,
  method: filters.method,
  decision: filters.decision,
  outcome: filters.outcome,
  since: filters.since,
  until: filters.until,
  task_id: filters.taskId,
  trace_id: filters.traceId,
  cursor: filters.cursor,
  limit: filters.limit,
});

/** One page of audit rows, newest first. */
export const listAuditEvents = async (
  token: string,
  filters: McpAuditFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpAuditEventList> =>
  fromWire<McpAuditEventList>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/audit', auditQuery(filters)),
      method: 'GET',
      token,
    }),
  );

/**
 * The rows matching the filters, whole, as one JSONL or CSV document.
 *
 * The cursor of the filters is ignored: an export is everything the filters
 * select, which is what a SIEM or a spreadsheet wants.
 */
export const exportAuditEvents = async (
  token: string,
  filters: Omit<McpAuditFilters, 'cursor' | 'limit'> = {},
  format: McpAuditExportFormat = 'jsonl',
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<string> => {
  const data = await requestDatalayerAPI<unknown>({
    url: mcpUrl(baseUrl, '/audit', { ...auditQuery(filters), export: format }),
    method: 'GET',
    token,
    headers: { Accept: format === 'csv' ? 'text/csv' : 'application/x-ndjson' },
    responseType: 'text',
  });
  return typeof data === 'string' ? data : JSON.stringify(data);
};
