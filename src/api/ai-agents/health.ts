/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Health check API functions for the agent-runtimes service.
 *
 * Provides functions to verify the agent-runtimes server is running,
 * ready, and to retrieve startup configuration.
 *
 * @module api/ai-agents/health
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type { HealthStatus, ReadinessStatus, StartupInfo } from './types';

/**
 * Basic health check for the agent-runtimes service.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Health status with timestamp
 */
export const healthCheck = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<HealthStatus> => {
  validateToken(token);

  return requestDatalayerAPI<HealthStatus>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/health`,
    method: 'GET',
    token,
  });
};

/**
 * Readiness check — is the service ready to accept traffic?
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Readiness status with component states
 */
export const readinessCheck = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ReadinessStatus> => {
  validateToken(token);

  return requestDatalayerAPI<ReadinessStatus>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/health/ready`,
    method: 'GET',
    token,
  });
};

/**
 * Liveness check — is the service alive?
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Liveness status
 */
export const livenessCheck = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<HealthStatus> => {
  validateToken(token);

  return requestDatalayerAPI<HealthStatus>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/health/live`,
    method: 'GET',
    token,
  });
};

/**
 * Get startup information including runtime and sandbox details.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Startup info with runtime host/port and sandbox configuration
 */
export const getStartupInfo = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<StartupInfo> => {
  validateToken(token);

  return requestDatalayerAPI<StartupInfo>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/health/startup`,
    method: 'GET',
    token,
  });
};

/**
 * Ping the AI Agents service.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Pong response
 */
export const ping = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/ping`,
    method: 'GET',
    token,
  });
};

/**
 * Get the AI Agents service version.
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Version information
 */
export const getVersion = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}/api/ai-agents/version`,
    method: 'GET',
  });
};
