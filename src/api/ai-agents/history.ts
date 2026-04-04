/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Conversation history API functions for agent-runtimes.
 *
 * Provides functions for retrieving, saving, and clearing
 * agent conversation history.
 *
 * @module api/ai-agents/history
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { ConversationHistory, HistoryUpsertRequest } from './types';

/**
 * Get conversation history for an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier (default: 'default')
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Conversation history with messages
 */
export const getConversationHistory = async (
  token: string,
  agentId: string = 'default',
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ConversationHistory> => {
  validateToken(token);

  const params = new URLSearchParams({ agent_id: agentId });

  return requestDatalayerAPI<ConversationHistory>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/history?${params.toString()}`,
    method: 'GET',
    token,
  });
};

/**
 * Save or update conversation history for an agent.
 * @param token - Authentication token (required)
 * @param request - History upsert request (agent_id + messages)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Confirmation
 */
export const upsertConversationHistory = async (
  token: string,
  request: HistoryUpsertRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/history`,
    method: 'POST',
    body: request,
    token,
  });
};

/**
 * Clear conversation history for an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier (default: 'default')
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Confirmation
 */
export const clearConversationHistory = async (
  token: string,
  agentId: string = 'default',
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  const params = new URLSearchParams({ agent_id: agentId });

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/history?${params.toString()}`,
    method: 'DELETE',
    token,
  });
};
