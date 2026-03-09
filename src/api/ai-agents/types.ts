/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TypeScript types for the AI Agents API.
 *
 * Matches the Python models in agent-runtimes and the
 * ai-agents Kubernetes service.
 *
 * @module api/ai-agents/types
 */

// ---- Running Agents ----

export interface RunningAgent {
  /** Unique agent ID within the runtime */
  agentId: string;
  /** Pod name in Kubernetes */
  podName: string;
  /** Agent display name */
  name: string;
  /** AgentSpec ID used to create the agent */
  specId?: string;
  /** Current agent status */
  status: AgentStatus;
  /** Model being used */
  model: string;
  /** When the agent was created */
  createdAt: string;
  /** Number of completed turns */
  turnCount: number;
  /** Total tokens consumed */
  totalTokens: number;
  /** Estimated cost in USD */
  totalCostUsd: number;
  /** Whether DBOS durability is enabled */
  durableEnabled: boolean;
}

export type AgentStatus =
  | 'running'
  | 'idle'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'checkpointed';

// ---- Tool Approvals ----

export interface ToolApproval {
  /** Unique approval request ID */
  id: string;
  /** Agent that requested the tool call */
  agentId: string;
  /** Pod running the agent */
  podName: string;
  /** Tool being requested */
  toolName: string;
  /** Tool call arguments */
  toolArgs: Record<string, unknown>;
  /** Current approval status */
  status: ToolApprovalStatus;
  /** When the request was created */
  createdAt: string;
  /** When the request was resolved */
  resolvedAt?: string;
  /** Who resolved the request */
  resolvedBy?: string;
  /** Optional note from the approver */
  note?: string;
  /** Time limit for the approval (ISO timestamp) */
  expiresAt?: string;
}

export type ToolApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'auto_approved';

export interface ToolApprovalFilters {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by status */
  status?: ToolApprovalStatus;
  /** Filter by tool name */
  toolName?: string;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ---- Agent Notifications ----

export interface AgentNotification {
  /** Unique notification ID */
  id: string;
  /** Agent that generated the notification */
  agentId: string;
  /** Pod running the agent */
  podName: string;
  /** Notification severity */
  level: NotificationLevel;
  /** Notification title */
  title: string;
  /** Notification body (markdown) */
  body: string;
  /** Whether the user has read this notification */
  read: boolean;
  /** When the notification was created */
  createdAt: string;
  /** Category for grouping */
  category: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

export interface NotificationFilters {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by level */
  level?: NotificationLevel;
  /** Only unread notifications */
  unreadOnly?: boolean;
  /** Filter by category */
  category?: string;
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ---- Conversation Checkpoints ----

export interface ConversationCheckpoint {
  /** Unique checkpoint ID */
  id: string;
  /** Human-readable label */
  label: string;
  /** Turn number when checkpointed */
  turn: number;
  /** Number of messages at checkpoint time */
  messageCount: number;
  /** When the checkpoint was created */
  createdAt: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

// ---- Agent Usage / Cost ----

export interface AgentUsageSummary {
  /** Agent ID */
  agentId: string;
  /** Total tokens (input + output) */
  totalTokens: number;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Estimated cost in USD */
  totalCostUsd: number;
  /** Number of model requests */
  requestCount: number;
  /** Number of tool calls */
  toolCallCount: number;
  /** Period start */
  periodStart: string;
  /** Period end */
  periodEnd: string;
}
