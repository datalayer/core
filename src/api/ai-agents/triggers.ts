/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Trigger management API functions for agent-runtimes.
 *
 * Provides functions for manually triggering agent runs
 * and managing webhook triggers.
 *
 * @module api/ai-agents/triggers
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  TriggerRunRequest,
  TriggerRunResult,
  WebhookInfo,
  WebhookResponse,
} from './types';

/**
 * Manually trigger an agent run.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier to trigger
 * @param request - Optional trigger request with prompt
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Trigger result with status and optional output/workflow_id
 */
export const triggerAgentRun = async (
  token: string,
  agentId: string,
  request?: TriggerRunRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<TriggerRunResult> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<TriggerRunResult>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/trigger/run`,
    method: 'POST',
    body: request ?? {},
    token,
  });
};

/**
 * Get webhook endpoint information for external systems to register.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Webhook URL and configuration for external registration
 */
export const getWebhookInfo = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<WebhookInfo> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<WebhookInfo>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/webhooks/${encodeURIComponent(agentId)}`,
    method: 'GET',
    token,
  });
};

/**
 * Fire a webhook event to trigger an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param payload - The webhook event payload
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Webhook response with trigger status
 */
export const fireWebhook = async (
  token: string,
  agentId: string,
  payload: Record<string, any>,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<WebhookResponse> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<WebhookResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/webhooks/${encodeURIComponent(agentId)}`,
    method: 'POST',
    body: payload,
    token,
  });
};

/**
 * Get webhook invocation history for an agent.
 * @param token - Authentication token (required)
 * @param agentId - The agent identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of past webhook invocations
 */
export const getWebhookHistory = async (
  token: string,
  agentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/webhooks/${encodeURIComponent(agentId)}/history`,
    method: 'GET',
    token,
  });
};
