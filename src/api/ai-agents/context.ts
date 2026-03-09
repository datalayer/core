/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Context usage API functions.
 *
 * Provides functions for retrieving real-time context window
 * usage and cost tracking data for agents.
 *
 * @module api/ai-agents/context
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { ContextUsage, CostUsage } from './types';

/**
 * Get current context window usage for an agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param baseUrl - Base URL
 * @returns Promise resolving to context usage data
 */
export const getContextUsage = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ContextUsage> => {
  validateToken(token);
  return requestDatalayerAPI<ContextUsage>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/context-usage`,
    method: 'GET',
    token,
  });
};

/**
 * Get cost/usage tracking data for an agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param baseUrl - Base URL
 * @returns Promise resolving to cost usage data
 */
export const getCostUsage = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<CostUsage> => {
  validateToken(token);
  return requestDatalayerAPI<CostUsage>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/cost-usage`,
    method: 'GET',
    token,
  });
};
