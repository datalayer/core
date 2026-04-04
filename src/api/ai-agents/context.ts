/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Context introspection API functions for agent-runtimes.
 *
 * Provides functions to inspect agent context usage, token consumption,
 * and conversation state.
 *
 * @module api/ai-agents/context
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  ContextDetails,
  ContextSnapshot,
  FullContextSnapshot,
  ContextExport,
  ContextTableResponse,
} from './types';

/**
 * Get context usage details for a specific agent (token counts by category).
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Context usage details (total tokens, breakdown by category)
 */
export const getContextDetails = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ContextDetails> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<ContextDetails>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/context-details`,
    method: 'GET',
    token,
  });
};

/**
 * Get current context snapshot for an agent (system prompts, messages, distribution).
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Context snapshot with distribution data for visualization
 */
export const getContextSnapshot = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ContextSnapshot> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<ContextSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/context-snapshot`,
    method: 'GET',
    token,
  });
};

/**
 * Get rendered context table as plain text for display.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param showContext - Whether to include the CONTEXT section (default: true)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Rendered table text
 */
export const getContextTable = async (
  token: string,
  agentId: string,
  showContext: boolean = true,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ContextTableResponse> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  const params = new URLSearchParams();
  if (!showContext) params.set('show_context', 'false');
  const query = params.toString() ? `?${params.toString()}` : '';

  return requestDatalayerAPI<ContextTableResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/context-table${query}`,
    method: 'GET',
    token,
  });
};

/**
 * Get full detailed context snapshot including model config, tools, memory, and rules.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Full context snapshot with complete introspection data
 */
export const getFullContext = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<FullContextSnapshot> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<FullContextSnapshot>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/full-context`,
    method: 'GET',
    token,
  });
};

/**
 * Export per-step usage data as CSV.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns CSV content with filename and step count
 */
export const exportContextCSV = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ContextExport> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<ContextExport>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/context-export`,
    method: 'GET',
    token,
  });
};

/**
 * Reset context usage statistics for an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Confirmation message
 */
export const resetContext = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ status: string; message: string }> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<{ status: string; message: string }>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/agents/${encodeURIComponent(agentId)}/context-details/reset`,
    method: 'POST',
    token,
  });
};
