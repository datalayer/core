/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Tool approval API functions for the agent-runtimes service.
 *
 * Provides the human-in-the-loop approval flow: list pending approvals,
 * approve or reject tool calls, and create new approval requests.
 *
 * @module api/ai-agents/tool-approvals
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type {
  ToolApprovalRecord,
  ToolApprovalCreateRequest,
  ToolApprovalDecisionRequest,
  ToolApprovalListFilters,
} from './types';

/**
 * List tool approval records, optionally filtered by agent or status.
 * @param token - Authentication token (required)
 * @param filters - Optional filters (agent_id, status)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns List of tool approval records
 */
export const listToolApprovals = async (
  token: string,
  filters?: ToolApprovalListFilters,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ToolApprovalRecord[]> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (filters?.agent_id) params.set('agent_id', filters.agent_id);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';

  return requestDatalayerAPI<ToolApprovalRecord[]>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals${query}`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific tool approval record.
 * @param token - Authentication token (required)
 * @param approvalId - The approval record identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns The tool approval record
 */
export const getToolApproval = async (
  token: string,
  approvalId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ToolApprovalRecord> => {
  validateToken(token);
  validateRequiredString(approvalId, 'approvalId');

  return requestDatalayerAPI<ToolApprovalRecord>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/${encodeURIComponent(approvalId)}`,
    method: 'GET',
    token,
  });
};

/**
 * Create a new tool approval request.
 * @param token - Authentication token (required)
 * @param request - The approval request details (tool_name, tool_args, etc.)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns The created approval record with status 'pending'
 */
export const createToolApproval = async (
  token: string,
  request: ToolApprovalCreateRequest,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ToolApprovalRecord> => {
  validateToken(token);

  return requestDatalayerAPI<ToolApprovalRecord>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals`,
    method: 'POST',
    body: request,
    token,
  });
};

/**
 * Approve a pending tool call.
 * @param token - Authentication token (required)
 * @param approvalId - The approval record identifier
 * @param note - Optional note explaining the approval
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns The updated approval record with status 'approved'
 */
export const approveToolCall = async (
  token: string,
  approvalId: string,
  note?: string | null,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ToolApprovalRecord> => {
  validateToken(token);
  validateRequiredString(approvalId, 'approvalId');

  const body: ToolApprovalDecisionRequest = { note: note ?? null };

  return requestDatalayerAPI<ToolApprovalRecord>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/${encodeURIComponent(approvalId)}/approve`,
    method: 'POST',
    body,
    token,
  });
};

/**
 * Reject a pending tool call.
 * @param token - Authentication token (required)
 * @param approvalId - The approval record identifier
 * @param note - Optional note explaining the rejection
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns The updated approval record with status 'rejected'
 */
export const rejectToolCall = async (
  token: string,
  approvalId: string,
  note?: string | null,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<ToolApprovalRecord> => {
  validateToken(token);
  validateRequiredString(approvalId, 'approvalId');

  const body: ToolApprovalDecisionRequest = { note: note ?? null };

  return requestDatalayerAPI<ToolApprovalRecord>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/${encodeURIComponent(approvalId)}/reject`,
    method: 'POST',
    body,
    token,
  });
};

/**
 * Mark a tool approval as read.
 * @param token - Authentication token (required)
 * @param approvalId - The approval record identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 */
export const markToolApprovalRead = async (
  token: string,
  approvalId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(approvalId, 'approvalId');

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/${encodeURIComponent(approvalId)}/mark-read`,
    method: 'POST',
    token,
  });
};

/**
 * Mark a tool approval as unread.
 * @param token - Authentication token (required)
 * @param approvalId - The approval record identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 */
export const markToolApprovalUnread = async (
  token: string,
  approvalId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(approvalId, 'approvalId');

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/${encodeURIComponent(approvalId)}/mark-unread`,
    method: 'POST',
    token,
  });
};

/**
 * Delete a tool approval record.
 * @param token - Authentication token (required)
 * @param approvalId - The approval record identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 */
export const deleteToolApproval = async (
  token: string,
  approvalId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<void> => {
  validateToken(token);
  validateRequiredString(approvalId, 'approvalId');

  await requestDatalayerAPI<void>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/${encodeURIComponent(approvalId)}`,
    method: 'DELETE',
    token,
  });
};

/**
 * Get count of pending tool approvals.
 * @param token - Authentication token (required)
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Pending approval count
 */
export const getPendingApprovalCount = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<{ count: number }> => {
  validateToken(token);

  return requestDatalayerAPI<{ count: number }>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/tool-approvals/pending/count`,
    method: 'GET',
    token,
  });
};
