/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Output artifacts API functions.
 *
 * Provides functions for listing and downloading agent-generated
 * output artifacts (PDFs, reports, etc.).
 *
 * @module api/ai-agents/output
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { OutputArtifact } from './types';

/**
 * List output artifacts for an agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param baseUrl - Base URL
 * @returns Promise resolving to list of output artifacts
 */
export const getAgentOutputs = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<OutputArtifact[]> => {
  validateToken(token);
  return requestDatalayerAPI<OutputArtifact[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/output`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific output artifact.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param artifactId - Artifact ID
 * @param baseUrl - Base URL
 * @returns Promise resolving to artifact details
 */
export const getAgentOutput = async (
  token: string,
  agentId: string,
  artifactId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<OutputArtifact> => {
  validateToken(token);
  return requestDatalayerAPI<OutputArtifact>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/output/${encodeURIComponent(artifactId)}`,
    method: 'GET',
    token,
  });
};

/**
 * Generate a new output artifact for an agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param format - Output format (e.g. 'pdf')
 * @param options - Additional generation options
 * @param baseUrl - Base URL
 * @returns Promise resolving to the generated artifact
 */
export const generateAgentOutput = async (
  token: string,
  agentId: string,
  format: string = 'pdf',
  options?: Record<string, unknown>,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<OutputArtifact> => {
  validateToken(token);
  return requestDatalayerAPI<OutputArtifact>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/output/generate`,
    method: 'POST',
    token,
    body: { format, ...options },
  });
};
