/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Agent Spaces API functions for the Datalayer platform.
 *
 * Provides functions for creating, listing, updating, and deleting agent spaces.
 *
 * @module api/spacer/agent-spaces
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

// =============================================================================
// Types
// =============================================================================

/**
 * MCP Server tool configuration
 */
export interface MCPServerTool {
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * MCP Server configuration
 */
export interface MCPServer {
  id: string;
  name: string;
  url?: string;
  enabled: boolean;
  tools: MCPServerTool[];
  command?: string;
  args: string[];
  isAvailable: boolean;
  transport: 'stdio' | 'http';
}

/**
 * Agent skill configuration
 */
export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  enabled: boolean;
}

/**
 * Agent specification model
 */
export interface AgentSpec {
  id: string;
  name: string;
  description: string;
  tags: string[];
  enabled: boolean;
  mcpServers: MCPServer[];
  skills: AgentSkill[];
  environmentName: string;
  icon?: string;
  color?: string;
  /** Chat suggestions to show users what this agent can do */
  suggestions?: string[];
}

/**
 * Agent space status
 */
export type AgentSpaceStatus =
  | 'starting'
  | 'running'
  | 'paused'
  | 'terminated'
  | 'archived';

/**
 * Agent space data
 */
export interface AgentSpaceData {
  id: string;
  name: string;
  description: string;
  status: AgentSpaceStatus;
  isPublic: boolean;
  tags: string[];
  messageCount: number;
  createdAt?: string;
  updatedAt?: string;
  thumbnail?: string;
  lastMessage?: string;
  author?: string;
  avatarUrl?: string;
  stars?: number;
  podName?: string;
  runtimeUrl?: string;
  creatorUid?: string;
  creatorHandle?: string;
  agentSpec?: AgentSpec;
}

/**
 * Request to create an agent space
 */
export interface CreateAgentSpaceRequest {
  /** Name of the agent space */
  name: string;
  /** Parent space ID */
  spaceId: string;
  /** Description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Initial status */
  status?: AgentSpaceStatus;
  /** Whether publicly visible */
  isPublic?: boolean;
  /** Agent specification */
  agentSpec?: AgentSpec;
  /** Thumbnail URL */
  thumbnail?: string;
}

/**
 * Request to update an agent space
 */
export interface UpdateAgentSpaceRequest {
  name?: string;
  description?: string;
  tags?: string[];
  status?: AgentSpaceStatus;
  isPublic?: boolean;
  agentSpec?: AgentSpec;
  podName?: string;
  runtimeUrl?: string;
  messageCount?: number;
  lastMessage?: string;
  thumbnail?: string;
}

/**
 * Response for single agent space operations
 */
export interface AgentSpaceResponse {
  success: boolean;
  message: string;
  agentSpace?: AgentSpaceData;
}

/**
 * Response for listing agent spaces
 */
export interface AgentSpacesResponse {
  success: boolean;
  message: string;
  agentSpaces?: AgentSpaceData[];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Create a new agent space.
 * @param token - Authentication token
 * @param data - Agent space creation configuration
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the created agent space response
 */
export const createAgentSpace = async (
  token: string,
  data: CreateAgentSpaceRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpaceResponse> => {
  return requestDatalayerAPI<AgentSpaceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * List agent spaces for the current user.
 * @param token - Authentication token
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the list of agent spaces
 */
export const listAgentSpaces = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpacesResponse> => {
  return requestDatalayerAPI<AgentSpacesResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces`,
    method: 'GET',
    token,
  });
};

/**
 * List all public agent spaces (Library).
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the list of public agent spaces
 */
export const listPublicAgentSpaces = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpacesResponse> => {
  return requestDatalayerAPI<AgentSpacesResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces/public`,
    method: 'GET',
  });
};

/**
 * Get an agent space by UID.
 * @param token - Authentication token
 * @param uid - The agent space UID
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the agent space
 */
export const getAgentSpace = async (
  token: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpaceResponse> => {
  return requestDatalayerAPI<AgentSpaceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces/${uid}`,
    method: 'GET',
    token,
  });
};

/**
 * Update an agent space.
 * @param token - Authentication token
 * @param uid - The agent space UID
 * @param data - Update data
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the updated agent space
 */
export const updateAgentSpace = async (
  token: string,
  uid: string,
  data: UpdateAgentSpaceRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpaceResponse> => {
  return requestDatalayerAPI<AgentSpaceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces/${uid}`,
    method: 'PUT',
    token,
    body: data,
  });
};

/**
 * Delete an agent space.
 * @param token - Authentication token
 * @param uid - The agent space UID
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving when deleted
 */
export const deleteAgentSpace = async (
  token: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<void> => {
  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces/${uid}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Make an agent space public (add to Library).
 * @param token - Authentication token
 * @param uid - The agent space UID
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the updated agent space
 */
export const makeAgentSpacePublic = async (
  token: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpaceResponse> => {
  return requestDatalayerAPI<AgentSpaceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces/${uid}/public`,
    method: 'POST',
    token,
  });
};

/**
 * Make an agent space private (remove from Library).
 * @param token - Authentication token
 * @param uid - The agent space UID
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to the updated agent space
 */
export const makeAgentSpacePrivate = async (
  token: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<AgentSpaceResponse> => {
  return requestDatalayerAPI<AgentSpaceResponse>({
    url: `${baseUrl}${API_BASE_PATHS.SPACER}/agent-spaces/${uid}/private`,
    method: 'POST',
    token,
  });
};
