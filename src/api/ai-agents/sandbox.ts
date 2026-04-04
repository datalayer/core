/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Sandbox and codemode management API functions.
 *
 * Provides functions for managing the code execution sandbox,
 * toggling codemode, and interrupting running code.
 *
 * @module api/ai-agents/sandbox
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type {
  SandboxStatus,
  CodemodeStatus,
  CodemodeToggleRequest,
  ConfigureSandboxRequest,
} from './types';

/**
 * Get the current codemode status.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Codemode status with enabled state, active skills, and sandbox info
 */
export const getCodemodeStatus = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<CodemodeStatus> => {
  validateToken(token);

  return requestDatalayerAPI<CodemodeStatus>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/codemode-status`,
    method: 'GET',
    token,
  });
};

/**
 * Toggle codemode on/off and optionally update skills.
 * Updates runtime state and agent adapters immediately.
 * @param token - Authentication token (required)
 * @param request - Toggle request with enabled state and optional skills list
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Updated codemode status with adapter update counts
 */
export const toggleCodemode = async (
  token: string,
  request: CodemodeToggleRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/codemode/toggle`,
    method: 'POST',
    body: request,
    token,
  });
};

/**
 * Get the current sandbox status.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Sandbox status including variant, connection state, and execution state
 */
export const getSandboxStatus = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<SandboxStatus & { available: boolean }> => {
  validateToken(token);

  return requestDatalayerAPI<SandboxStatus & { available: boolean }>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/sandbox-status`,
    method: 'GET',
    token,
  });
};

/**
 * Interrupt currently running code in the sandbox.
 * @param token - Authentication token (required)
 * @param agentId - Optional agent ID to interrupt a specific agent's sandbox
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Interrupt result
 */
export const interruptSandbox = async (
  token: string,
  agentId?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ interrupted: boolean; reason?: string }> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (agentId) params.set('agent_id', agentId);
  const query = params.toString() ? `?${params.toString()}` : '';

  return requestDatalayerAPI<{ interrupted: boolean; reason?: string }>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/configure/sandbox/interrupt${query}`,
    method: 'POST',
    token,
  });
};

/**
 * Get the sandbox manager status (variant, configuration).
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Sandbox manager status
 */
export const getAgentSandboxStatus = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/sandbox/status`,
    method: 'GET',
    token,
  });
};

/**
 * Configure the code sandbox manager.
 * @param token - Authentication token (required)
 * @param request - Sandbox configuration (variant, jupyter_url, etc.)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Updated sandbox status
 */
export const configureSandbox = async (
  token: string,
  request: ConfigureSandboxRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/sandbox/configure`,
    method: 'POST',
    body: request,
    token,
  });
};

/**
 * Restart the code sandbox with current configuration.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Updated sandbox status after restart
 */
export const restartSandbox = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/agents/sandbox/restart`,
    method: 'POST',
    token,
  });
};
