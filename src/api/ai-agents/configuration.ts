/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Frontend configuration API functions for the agent-runtimes service.
 *
 * Provides functions for retrieving frontend configuration (models, tools,
 * MCP servers) and agent creation specs.
 *
 * @module api/ai-agents/configuration
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type { FrontendConfig } from './types';

/**
 * Get frontend configuration including available models, tools, and MCP servers.
 * @param token - Authentication token (required)
 * @param mcpUrl - Optional MCP server URL to fetch tools from
 * @param mcpToken - Optional authentication token for the MCP server
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Frontend configuration with models, tools, and MCP servers
 */
export const getFrontendConfig = async (
  token: string,
  mcpUrl?: string,
  mcpToken?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<FrontendConfig> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (mcpUrl) params.set('mcp_url', mcpUrl);
  if (mcpToken) params.set('mcp_token', mcpToken);
  const query = params.toString() ? `?${params.toString()}` : '';

  return requestDatalayerAPI<FrontendConfig>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure${query}`,
    method: 'GET',
    token,
  });
};

/**
 * Get the original creation spec for a specific agent.
 * Includes the separated system_prompt and system_prompt_codemode_addons
 * which are merged at runtime.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Original agent creation spec with sandbox status
 */
export const getAgentCreationSpec = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/spec`,
    method: 'GET',
    token,
  });
};

/**
 * Get MCP toolsets status for Pydantic AI agents.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Status of config MCP toolsets (ready, pending, failed servers)
 */
export const getMCPToolsetsStatus = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/mcp-toolsets-status`,
    method: 'GET',
    token,
  });
};

/**
 * Get information about running config MCP toolsets.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of running MCP server info (sensitive data redacted)
 */
export const getMCPToolsetsInfo = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>[]> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/mcp-toolsets-info`,
    method: 'GET',
    token,
  });
};
