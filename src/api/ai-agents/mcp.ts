/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * MCP (Model Context Protocol) server management API functions.
 *
 * Provides functions for managing MCP servers: listing catalogs,
 * starting/stopping servers, and enabling catalog servers.
 *
 * @module api/ai-agents/mcp
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  MCPCatalogEntry,
  MCPServerInfo,
  MCPServerStartRequest,
  MCPServerStartResponse,
} from './types';

/**
 * List all MCP servers from the catalog.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of available MCP servers from the catalog
 */
export const listMCPCatalog = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<MCPCatalogEntry[]> => {
  validateToken(token);

  return requestDatalayerAPI<MCPCatalogEntry[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/mcp/servers/catalog`,
    method: 'GET',
    token,
  });
};

/**
 * List all available MCP servers (catalog + running config servers).
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Combined list of catalog and running MCP servers
 */
export const listAvailableMCPServers = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<MCPServerInfo[]> => {
  validateToken(token);

  return requestDatalayerAPI<MCPServerInfo[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/mcp/servers/available`,
    method: 'GET',
    token,
  });
};

/**
 * Get MCP config servers from mcp.json.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of configured MCP servers
 */
export const getMCPConfigServers = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<MCPServerInfo[]> => {
  validateToken(token);

  return requestDatalayerAPI<MCPServerInfo[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/mcp/servers/config`,
    method: 'GET',
    token,
  });
};

/**
 * Enable (start) a catalog MCP server.
 * @param token - Authentication token (required)
 * @param serverName - Name of the catalog server to enable
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Start result
 */
export const enableCatalogServer = async (
  token: string,
  serverName: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);
  validateRequiredString(serverName, 'serverName');

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/mcp/servers/catalog/${encodeURIComponent(serverName)}/enable`,
    method: 'POST',
    token,
  });
};

/**
 * Start catalog MCP servers for a specific agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param request - Optional server list to start
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Start result with started, failed, and already_running servers
 */
export const startAgentMCPServers = async (
  token: string,
  agentId: string,
  request?: MCPServerStartRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<MCPServerStartResponse> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<MCPServerStartResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/mcp-servers/start`,
    method: 'POST',
    body: request ?? {},
    token,
  });
};

/**
 * Stop catalog MCP servers for a specific agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Stop result
 */
export const stopAgentMCPServers = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/mcp-servers/stop`,
    method: 'POST',
    token,
  });
};

/**
 * Start catalog MCP servers for all running agents.
 * @param token - Authentication token (required)
 * @param request - Optional server list to start
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Start result
 */
export const startAllAgentsMCPServers = async (
  token: string,
  request?: MCPServerStartRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<MCPServerStartResponse> => {
  validateToken(token);

  return requestDatalayerAPI<MCPServerStartResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/mcp-servers/start`,
    method: 'POST',
    body: request ?? {},
    token,
  });
};

/**
 * Stop catalog MCP servers for all running agents.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Stop result
 */
export const stopAllAgentsMCPServers = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/mcp-servers/stop`,
    method: 'POST',
    token,
  });
};
