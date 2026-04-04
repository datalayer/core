/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Agent spec library API functions.
 *
 * Provides functions for browsing predefined agent templates
 * that can be used to create new agents.
 *
 * @module api/ai-agents/library
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type { AgentSpec } from './types';

/**
 * List all available agent specifications from the library.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of predefined agent templates
 */
export const listAgentSpecs = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentSpec[]> => {
  validateToken(token);

  return requestDatalayerAPI<AgentSpec[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/library`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific agent specification from the library.
 * @param token - Authentication token (required)
 * @param agentId - The ID of the agent spec (e.g., 'data-acquisition', 'crawler')
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns The agent spec template
 */
export const getAgentSpec = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentSpec> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<AgentSpec>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/library/${encodeURIComponent(agentId)}`,
    method: 'GET',
    token,
  });
};
