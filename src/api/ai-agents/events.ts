/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Agent events API functions.
 *
 * Provides CRUD operations for agent event records
 * (started, ended, tool-approval-requested, etc.).
 *
 * @module api/ai-agents/events
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  AgentEvent,
  CreateAgentEventRequest,
  UpdateAgentEventRequest,
  ListAgentEventsParams,
  ListAgentEventsResponse,
} from './types';

const agentEventsPath = (agentId: string) =>
  `${API_BASE_PATHS.AI_AGENTS}/agents/${encodeURIComponent(agentId)}/events`;

const toQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.append(k, String(v));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

/**
 * List events across all agents for the authenticated user.
 * @param token - Authentication token
 * @param params - Optional filters (event_type, level, limit, offset)
 * @param baseUrl - Base URL
 * @returns List of events
 */
export const listAllEvents = async (
  token: string,
  params: Omit<ListAgentEventsParams, 'agent_id'> = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ListAgentEventsResponse> => {
  validateToken(token);

  return requestDatalayerAPI<ListAgentEventsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/events${toQueryString(params)}`,
    method: 'GET',
    token,
  });
};

/**
 * List events for a specific agent.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param params - Optional filters
 * @param baseUrl - Base URL
 * @returns List of events
 */
export const listEvents = async (
  token: string,
  agentId: string,
  params: Omit<ListAgentEventsParams, 'agent_id'> = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ListAgentEventsResponse> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');

  return requestDatalayerAPI<ListAgentEventsResponse>({
    url: `${baseUrl}${agentEventsPath(agentId)}${toQueryString(params)}`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific event.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param eventId - Event ID
 * @param baseUrl - Base URL
 * @returns Event details
 */
export const getEvent = async (
  token: string,
  agentId: string,
  eventId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentEvent> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');
  validateRequiredString(eventId, 'eventId');

  return requestDatalayerAPI<AgentEvent>({
    url: `${baseUrl}${agentEventsPath(agentId)}/${encodeURIComponent(eventId)}`,
    method: 'GET',
    token,
  });
};

/**
 * Create a new event for an agent.
 * @param token - Authentication token
 * @param data - Event creation data (agent_id, title, etc.)
 * @param baseUrl - Base URL
 * @returns Created event
 */
export const createEvent = async (
  token: string,
  data: CreateAgentEventRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ success: boolean; event: AgentEvent }> => {
  validateToken(token);
  validateRequiredString(data.agent_id, 'agent_id');

  return requestDatalayerAPI<{ success: boolean; event: AgentEvent }>({
    url: `${baseUrl}${agentEventsPath(data.agent_id)}`,
    method: 'POST',
    token,
    body: data,
  });
};

/**
 * Update an existing event.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param eventId - Event ID
 * @param data - Fields to update
 * @param baseUrl - Base URL
 * @returns Updated event
 */
export const updateEvent = async (
  token: string,
  agentId: string,
  eventId: string,
  data: UpdateAgentEventRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentEvent> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');
  validateRequiredString(eventId, 'eventId');

  return requestDatalayerAPI<AgentEvent>({
    url: `${baseUrl}${agentEventsPath(agentId)}/${encodeURIComponent(eventId)}`,
    method: 'PATCH',
    token,
    body: data,
  });
};

/**
 * Delete an event.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param eventId - Event ID
 * @param baseUrl - Base URL
 * @returns Deletion confirmation
 */
export const deleteEvent = async (
  token: string,
  agentId: string,
  eventId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ success: boolean }> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');
  validateRequiredString(eventId, 'eventId');

  return requestDatalayerAPI<{ success: boolean }>({
    url: `${baseUrl}${agentEventsPath(agentId)}/${encodeURIComponent(eventId)}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Mark an event as read via dedicated endpoint.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param eventId - Event ID
 * @param baseUrl - Base URL
 * @returns Updated event
 */
export const markEventRead = async (
  token: string,
  agentId: string,
  eventId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentEvent> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');
  validateRequiredString(eventId, 'eventId');

  return requestDatalayerAPI<AgentEvent>({
    url: `${baseUrl}${agentEventsPath(agentId)}/${encodeURIComponent(eventId)}/mark-read`,
    method: 'POST',
    token,
  });
};

/**
 * Mark an event as unread via dedicated endpoint.
 * @param token - Authentication token
 * @param agentId - Agent ID
 * @param eventId - Event ID
 * @param baseUrl - Base URL
 * @returns Updated event
 */
export const markEventUnread = async (
  token: string,
  agentId: string,
  eventId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<AgentEvent> => {
  validateToken(token);
  validateRequiredString(agentId, 'agentId');
  validateRequiredString(eventId, 'eventId');

  return requestDatalayerAPI<AgentEvent>({
    url: `${baseUrl}${agentEventsPath(agentId)}/${encodeURIComponent(eventId)}/mark-unread`,
    method: 'POST',
    token,
  });
};
