/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Agent notifications API functions.
 *
 * Provides CRUD operations for agent-generated notifications.
 * Agents emit notifications for guardrail events, budget warnings,
 * task completions, and other notable events.
 *
 * @module api/ai-agents/notifications
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  AgentNotification,
  NotificationListFilters,
  CreateNotificationRequest,
} from './types';

/**
 * List agent notifications with optional filters.
 * @param token - Authentication token
 * @param filters - Optional filters (agentId, level, unreadOnly, category, limit, offset)
 * @param baseUrl - Base URL
 * @returns List of notifications
 */
export const listNotifications = async (
  token: string,
  filters?: NotificationListFilters,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentNotification[]> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (filters?.agentId) params.set('agent_id', filters.agentId);
  if (filters?.level) params.set('level', filters.level);
  if (filters?.unreadOnly) params.set('unread_only', 'true');
  if (filters?.category) params.set('category', filters.category);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));

  const query = params.toString() ? `?${params.toString()}` : '';

  return requestDatalayerAPI<AgentNotification[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/notifications${query}`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific notification by ID.
 * @param token - Authentication token
 * @param id - Notification ID
 * @param baseUrl - Base URL
 * @returns Notification details
 */
export const getNotification = async (
  token: string,
  id: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentNotification> => {
  validateToken(token);
  validateRequiredString(id, 'id');

  return requestDatalayerAPI<AgentNotification>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/notifications/${encodeURIComponent(id)}`,
    method: 'GET',
    token,
  });
};

/**
 * Mark a notification as read.
 * @param token - Authentication token
 * @param id - Notification ID
 * @param baseUrl - Base URL
 */
export const markNotificationRead = async (
  token: string,
  id: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(id, 'id');

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/notifications/${encodeURIComponent(id)}/read`,
    method: 'POST',
    token,
  });
};

/**
 * Mark all notifications as read, optionally for a specific agent.
 * @param token - Authentication token
 * @param agentId - Optional: only mark notifications for this agent
 * @param baseUrl - Base URL
 */
export const markAllNotificationsRead = async (
  token: string,
  agentId?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);

  const body = agentId ? { agent_id: agentId } : {};

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/notifications/mark-all-read`,
    method: 'POST',
    body,
    token,
  });
};

/**
 * Create a notification.
 * @param token - Authentication token
 * @param request - Notification creation data
 * @param baseUrl - Base URL
 * @returns Created notification
 */
export const createNotification = async (
  token: string,
  request: CreateNotificationRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentNotification> => {
  validateToken(token);

  return requestDatalayerAPI<AgentNotification>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/notifications`,
    method: 'POST',
    body: request,
    token,
  });
};

/**
 * Get count of unread notifications.
 * @param token - Authentication token
 * @param baseUrl - Base URL
 * @returns Unread notification count
 */
export const getUnreadNotificationCount = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ count: number }> => {
  validateToken(token);

  return requestDatalayerAPI<{ count: number }>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/notifications/unread/count`,
    method: 'GET',
    token,
  });
};
