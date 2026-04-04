/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Evaluation runs API functions.
 *
 * Provides functions for triggering, listing, and retrieving
 * evaluation reports for agents.
 *
 * @module api/ai-agents/evals
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type { EvalReport, RunEvalsRequest } from './types';

/**
 * Trigger an evaluation run for an agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param request - Eval run request body
 * @param baseUrl - Base URL
 * @returns Eval report
 */
export const runEvals = async (
  token: string,
  agentId: string,
  request: RunEvalsRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<EvalReport> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<EvalReport>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/evals/run`,
    method: 'POST',
    token,
    body: request,
  });
};

/**
 * List past evaluation runs for an agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param baseUrl - Base URL
 * @returns List of eval reports
 */
export const listEvals = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<EvalReport[]> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<EvalReport[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/evals`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific evaluation report.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param evalId - Eval run ID
 * @param baseUrl - Base URL
 * @returns Eval report
 */
export const getEval = async (
  token: string,
  agentId: string,
  evalId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<EvalReport> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');
  validateRequiredString(evalId, 'evalId');

  return requestDatalayerAPI<EvalReport>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/evals/${encodeURIComponent(evalId)}`,
    method: 'GET',
    token,
  });
};
