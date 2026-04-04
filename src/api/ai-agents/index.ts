/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * AI Agents API exports.
 *
 * Provides organized access to agent management, tool approvals,
 * triggers, context introspection, notifications, events, evals,
 * skills, output artifacts, and configuration functionality.
 *
 * @module api/ai-agents
 */

// Client factory
export { createAIAgentsClient } from './client';
export type {
  AIAgentsClient,
  AIAgentsClientConfig,
  AIAgentsTargetType,
} from './client';

export * as agents from './agents';
export * as configuration from './configuration';
export * as context from './context';
export * as evals from './evals';
export * as events from './events';
export * as health from './health';
export * as history from './history';
export * as identity from './identity';
export * as library from './library';
export * as mcp from './mcp';
export * as notifications from './notifications';
export * as output from './output';
export * as sandbox from './sandbox';
export * as skills from './skills';
export * as toolApprovals from './tool-approvals';
export * as triggers from './triggers';

// Re-export all types for convenience
export type {
  // Health
  HealthStatus,
  ReadinessStatus,
  StartupInfo,
  SandboxInfo,
  // Agent Management
  AgentInfo,
  CreateAgentRequest,
  CreateAgentResponse,
  AgentListResponse,
  AgentCodemodeConfig,
  // Durable Agents
  RunningAgent,
  AgentUsageSummary,
  ConversationCheckpoint,
  ContextUsage,
  CostUsage,
  // Agent Spec Library
  AgentSpec,
  // Frontend Configuration
  FrontendConfig,
  ModelInfo,
  ToolInfo,
  MCPServerInfo,
  MCPServerTool,
  // Tool Approvals
  ToolApprovalRecord,
  ToolApprovalCreateRequest,
  ToolApprovalDecisionRequest,
  ToolApprovalListFilters,
  // Triggers
  TriggerType,
  TriggerConfig,
  TriggerField,
  TriggerSpec,
  TriggerRunRequest,
  TriggerRunResult,
  WebhookInfo,
  WebhookResponse,
  // Notifications (channel specs)
  NotificationField,
  NotificationChannelSpec,
  NotificationConfig,
  // Notifications (runtime)
  AgentNotification,
  NotificationListFilters,
  CreateNotificationRequest,
  // Events
  AgentEvent,
  CreateAgentEventRequest,
  UpdateAgentEventRequest,
  ListAgentEventsParams,
  ListAgentEventsResponse,
  // Output Artifacts
  OutputArtifact,
  // Evaluations
  RunEvalsRequest,
  EvalReport,
  // Skills
  SkillInfo,
  SkillsResponse,
  // Context Introspection
  ContextDetails,
  ContextSnapshot,
  FullContextSnapshot,
  ContextExport,
  ContextTableResponse,
  // History
  ConversationMessage,
  ConversationHistory,
  HistoryUpsertRequest,
  // Sandbox
  SandboxStatus,
  CodemodeStatus,
  CodemodeSkill,
  CodemodeToggleRequest,
  ConfigureSandboxRequest,
  // MCP
  MCPCatalogEntry,
  MCPToolsetsStatus,
  MCPServerStartRequest,
  MCPServerStartResponse,
  // Transport
  AgentProtocol,
  UpdateTransportRequest,
  UpdateMCPServersRequest,
  // Guardrails
  GuardrailSpec,
  GuardrailPermissions,
  TokenLimits,
} from './types';

// Direct function exports for convenience
export {
  healthCheck,
  readinessCheck,
  livenessCheck,
  getStartupInfo,
  ping,
  getVersion,
} from './health';
export {
  listAgents,
  getAgent,
  createAgent,
  deleteAgent,
  patchAgent,
  pauseAgent,
  resumeAgent,
  getAgentCheckpoints,
  getAgentUsage,
  getAgentContextUsage,
  getAgentCostUsage,
} from './agents';
export { listAgentSpecs, getAgentSpec } from './library';
export { getFrontendConfig, getAgentCreationSpec } from './configuration';
export {
  listToolApprovals,
  getToolApproval,
  createToolApproval,
  approveToolCall,
  rejectToolCall,
  markToolApprovalRead,
  markToolApprovalUnread,
  deleteToolApproval,
  getPendingApprovalCount,
} from './tool-approvals';
export {
  triggerAgentRun,
  getWebhookInfo,
  fireWebhook,
  getWebhookHistory,
} from './triggers';
export {
  getContextDetails,
  getContextSnapshot,
  getFullContext,
  exportContextCSV,
  resetContext,
} from './context';
export {
  getConversationHistory,
  upsertConversationHistory,
  clearConversationHistory,
} from './history';
export { getCodemodeStatus, toggleCodemode, interruptSandbox } from './sandbox';
export { listMCPCatalog, listAvailableMCPServers } from './mcp';
export {
  listNotifications,
  getNotification,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from './notifications';
export {
  listAllEvents,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  markEventRead,
  markEventUnread,
} from './events';
export {
  listAgentOutputs,
  getAgentOutput,
  generateAgentOutput,
} from './output';
export { runEvals, listEvals, getEval } from './evals';
export { listSkills, getSkill, getSkillContent } from './skills';
export { exchangeOAuthToken, getOAuthUserInfo } from './identity';
