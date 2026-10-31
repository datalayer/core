/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What one agent may execute and reach.
 *
 * Both routes take `grant`, the uid of one of the caller's connected agents;
 * without it the caller is asked about itself, which is how an agent holds
 * these answers against its own token.
 *
 * @module api/mcp/agentAccess
 */

import { DEFAULT_SERVICE_URLS } from '../constants';
import { requestDatalayerAPI } from '../DatalayerApi';
import { fromWire, mcpUrl } from './gateway';
import type {
  McpAgentReach,
  McpAgentToolsets,
} from '../../models/McpAgentAccess';

export type {
  McpAgentNamed,
  McpAgentReach,
  McpAgentTool,
  McpAgentToolset,
  McpAgentToolsets,
  McpReachRow,
  McpSourceApprovalPolicy,
  McpToolsetHealth,
  McpToolsetHealthState,
  McpToolsetSelected,
} from '../../models/McpAgentAccess';

export interface McpAgentAccessFilters {
  /** One of the caller's connected agents, by its uid. */
  grant?: string;
}

/** The toolsets an agent may execute: their tools, approval and health. */
export const getAgentToolsets = async (
  token: string,
  filters: McpAgentAccessFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpAgentToolsets> =>
  fromWire<McpAgentToolsets>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/toolsets', { ...filters }),
      method: 'GET',
      token,
    }),
  );

/** The notebooks and sources an agent can reach, and how far. */
export const getAgentReach = async (
  token: string,
  filters: McpAgentAccessFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpAgentReach> =>
  fromWire<McpAgentReach>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/reach', { ...filters }),
      method: 'GET',
      token,
    }),
  );
