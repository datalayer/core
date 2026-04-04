/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Agent CRUD API functions for the agent-runtimes service.
 *
 * Provides functions for creating, listing, retrieving, and deleting agents.
 *
 * @module api/ai-agents/agents
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  AgentInfo,
  AgentListResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  UpdateTransportRequest,
  UpdateMCPServersRequest,
  AgentUsageSummary,
  ConversationCheckpoint,
  ContextUsage,
  CostUsage,
} from './types';

/**
 * List all registered agents.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of running agents with their status
 */
export const listAgents = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentListResponse> => {
  validateToken(token);

  return requestDatalayerAPI<AgentListResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents`,
    method: 'GET',
    token,
  });
};

/**
 * Get information about a specific agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Agent details including status, model, and transport info
 */
export const getAgent = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentInfo> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<AgentInfo>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}`,
    method: 'GET',
    token,
  });
};

/**
 * Create a new agent from a spec.
 * @param token - Authentication token (required)
 * @param request - Agent creation configuration
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Created agent details with ID and transport endpoints
 */
export const createAgent = async (
  token: string,
  request: CreateAgentRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<CreateAgentResponse> => {
  validateToken(token);

  return requestDatalayerAPI<CreateAgentResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents`,
    method: 'POST',
    body: request,
    token,
  });
};

/**
 * Delete an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier to delete
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Deletion confirmation
 */
export const deleteAgent = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ status: string; message: string }> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<{ status: string; message: string }>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Update the transport protocol for an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param request - Transport update configuration
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Updated agent info
 */
export const updateAgentTransport = async (
  token: string,
  agentId: string,
  request: UpdateTransportRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<any> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/transport`,
    method: 'PATCH',
    body: request,
    token,
  });
};

/**
 * Update MCP servers for an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param request - MCP servers update configuration
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Updated MCP server list
 */
export const updateAgentMCPServers = async (
  token: string,
  agentId: string,
  request: UpdateMCPServersRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<any> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/mcp-servers`,
    method: 'PATCH',
    body: request,
    token,
  });
};

/**
 * Configure an agent from a spec (reconfigure a running agent).
 * @param token - Authentication token (required)
 * @param spec - The agent spec to apply
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Configuration result
 */
export const configureFromSpec = async (
  token: string,
  spec: Record<string, any>,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<any> => {
  validateToken(token);

  return requestDatalayerAPI({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/configure-from-spec`,
    method: 'POST',
    body: spec,
    token,
  });
};

/**
 * Patch/update an agent (e.g., update its runtime binding).
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier (document ID)
 * @param body - Fields to patch
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Updated agent info
 */
export const patchAgent = async (
  token: string,
  agentId: string,
  body: Record<string, any>,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<any> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}`,
    method: 'PATCH',
    body,
    token,
  });
};

// ============================================================================
// Durable Agent Lifecycle (pause/resume/checkpoints/usage)
// ============================================================================

/**
 * Pause a running agent (creates a checkpoint).
 * @param token - Authentication token (required)
 * @param podName - Pod name hosting the agent
 * @param baseUrl - Base URL for the agent-runtimes service
 */
export const pauseAgent = async (
  token: string,
  podName: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(podName, 'podName');

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(podName)}/pause`,
    method: 'POST',
    token,
  });
};

/**
 * Resume a paused/checkpointed agent.
 * @param token - Authentication token (required)
 * @param podName - Pod name hosting the agent
 * @param baseUrl - Base URL for the agent-runtimes service
 */
export const resumeAgent = async (
  token: string,
  podName: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(podName, 'podName');

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(podName)}/resume`,
    method: 'POST',
    token,
  });
};

/**
 * Get conversation checkpoints for an agent.
 * @param token - Authentication token (required)
 * @param podName - Pod name hosting the agent
 * @param agentId - Optional agent ID within the pod
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of conversation checkpoints
 */
export const getAgentCheckpoints = async (
  token: string,
  podName: string,
  agentId?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ConversationCheckpoint[]> => {
  validateToken(token);
  validateRequiredString(podName, 'podName');

  const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';

  return requestDatalayerAPI<ConversationCheckpoint[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(podName)}/checkpoints${query}`,
    method: 'GET',
    token,
  });
};

/**
 * Get usage summary for an agent.
 * @param token - Authentication token (required)
 * @param podName - Pod name hosting the agent
 * @param agentId - Optional agent ID within the pod
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Agent usage summary
 */
export const getAgentUsage = async (
  token: string,
  podName: string,
  agentId?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentUsageSummary> => {
  validateToken(token);
  validateRequiredString(podName, 'podName');

  const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';

  return requestDatalayerAPI<AgentUsageSummary>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(podName)}/usage${query}`,
    method: 'GET',
    token,
  });
};

/**
 * Get current context window usage for an agent.
 * @param token - Authentication token (required)
 * @param agentId - Agent ID
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Context usage data
 */
export const getAgentContextUsage = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ContextUsage> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<ContextUsage>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/context-usage`,
    method: 'GET',
    token,
  });
};

/**
 * Get cost/usage tracking data for an agent.
 * @param token - Authentication token (required)
 * @param agentId - Agent ID
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Cost usage data
 */
export const getAgentCostUsage = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<CostUsage> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<CostUsage>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/cost-usage`,
    method: 'GET',
    token,
  });
};
