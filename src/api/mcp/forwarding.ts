/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Whether an organization's audit is reaching its own system of record.
 *
 * Forwarding never fails the call it describes — an audit row that could not
 * be shipped is still a row, and holding up somebody's tool call because
 * their SIEM is down would be the worse trade. Which means a failure is
 * **invisible unless something reports it**, and a silently dropped record
 * looks exactly like nothing having happened.
 *
 * This is that something.
 *
 * @module api/mcp/forwarding
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { mcpUrl } from './gateway';

export interface McpForwardingState {
  orgUid: string;
  /** When a batch was last accepted by the destination. */
  lastDeliveredAt?: string | null;
  /** What the destination last said, when it refused. */
  lastError?: string | null;
  lastErrorAt?: string | null;
  delivered: number;
  failed: number;
  /** Whether the last attempt succeeded. */
  healthy: boolean;
}

export interface McpForwarding {
  /**
   * Whether anything has ever been delivered or attempted.
   *
   * Kept apart from `healthy` because "never attempted" and "working" read
   * the same in a counter — and for an organization that configured a
   * destination, the first is the worse state and the one that looks most
   * like fine.
   */
  configured: boolean;
  state: McpForwardingState | null;
}

interface WireState {
  org_uid?: string | null;
  last_delivered_at?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
  delivered?: number | null;
  failed?: number | null;
  healthy?: boolean | null;
}

export const getMcpForwarding = async (
  token: string,
  org: string = '',
  mcpServerUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpForwarding> => {
  const response = await requestDatalayerAPI<{
    configured?: boolean;
    state?: WireState | null;
  }>({
    url: mcpUrl(mcpServerUrl, '/audit/forwarding', org ? { org } : {}),
    method: 'GET',
    token,
  });
  const wire = response.state;
  return {
    configured: Boolean(response.configured),
    state: wire
      ? {
          orgUid: wire.org_uid ?? '',
          lastDeliveredAt: wire.last_delivered_at ?? null,
          lastError: wire.last_error ?? null,
          lastErrorAt: wire.last_error_at ?? null,
          delivered: wire.delivered ?? 0,
          failed: wire.failed ?? 0,
          healthy: Boolean(wire.healthy),
        }
      : null,
  };
};
