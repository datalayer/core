/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TypeScript types for the AI Agents API.
 *
 * These types mirror the Python Pydantic models in agent-runtimes
 * and provide type safety for the @datalayer/core SDK.
 *
 * @module api/ai-agents/types
 */

// ============================================================================
// Health
// ============================================================================

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}

export interface ReadinessStatus {
  status: string;
  timestamp: string;
  components: Record<string, string>;
}

export interface StartupInfo {
  status: string;
  timestamp: string;
  runtime?: Record<string, any>;
  sandbox?: SandboxInfo;
  [key: string]: any;
}

export interface SandboxInfo {
  variant: string;
  jupyter_url?: string;
  jupyter_token?: string;
  mcp_proxy_url?: string;
  sandbox_running?: boolean;
}

// ============================================================================
// Agent Management
// ============================================================================

export interface AgentInfo {
  agent_id: string;
  name: string;
  status: string;
  model: string;
  protocol?: string;
  transports?: Record<string, any>;
  [key: string]: any;
}

export interface CreateAgentRequest {
  name?: string;
  description?: string;
  model?: string;
  system_prompt?: string;
  system_prompt_codemode_addons?: string;
  tools?: any[];
  mcp_servers?: any[];
  skills?: any[];
  frontend_tools?: any[];
  protocol?: string;
  codemode?: AgentCodemodeConfig;
  trigger?: TriggerConfig;
  notifications?: NotificationConfig[];
  guardrails?: any[];
  memory?: string;
  agent_spec_id?: string;
  [key: string]: any;
}

export interface CreateAgentResponse {
  agent_id: string;
  status: string;
  transports: Record<string, string>;
  [key: string]: any;
}

export interface AgentListResponse {
  agents: AgentInfo[];
}

export interface AgentCodemodeConfig {
  enabled?: boolean;
  token_reduction?: boolean;
  speedup?: boolean;
}

// ============================================================================
// Agent Spec Library
// ============================================================================

export interface AgentSpec {
  id: string;
  version?: string;
  name: string;
  description?: string;
  system_prompt?: string;
  system_prompt_codemode_addons?: string;
  tags?: string[];
  enabled?: boolean;
  model?: string;
  mcp_servers?: any[];
  skills?: any[];
  tools?: any[];
  frontend_tools?: any[];
  environment_name?: string;
  icon?: string;
  emoji?: string;
  color?: string;
  suggestions?: string[];
  welcome_message?: string;
  sandbox_variant?: string;
  goal?: string;
  protocol?: string;
  trigger?: TriggerConfig;
  guardrails?: any[];
  evals?: any[];
  codemode?: AgentCodemodeConfig;
  output?: any;
  advanced?: any;
  notifications?: NotificationConfig[];
  memory?: string;
  [key: string]: any;
}

// ============================================================================
// Frontend Configuration
// ============================================================================

export interface FrontendConfig {
  models: ModelInfo[];
  default_model: string;
  builtin_tools: ToolInfo[];
  mcp_servers: MCPServerInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  context_window?: number;
  [key: string]: any;
}

export interface ToolInfo {
  name: string;
  description?: string;
  enabled?: boolean;
  requires_approval?: boolean;
  input_schema?: Record<string, any>;
  [key: string]: any;
}

export interface MCPServerInfo {
  id?: string;
  name: string;
  description?: string;
  url?: string;
  transport?: 'stdio' | 'http';
  command?: string;
  args?: string[];
  enabled?: boolean;
  tools?: MCPServerTool[];
  [key: string]: any;
}

export interface MCPServerTool {
  name: string;
  description?: string;
  enabled?: boolean;
  input_schema?: Record<string, any>;
}

// ============================================================================
// Tool Approvals
// ============================================================================

export interface ToolApprovalRecord {
  id: string;
  agent_id: string;
  pod_name: string;
  tool_name: string;
  tool_args: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolApprovalCreateRequest {
  agent_id?: string;
  pod_name?: string;
  tool_name: string;
  tool_args?: Record<string, any>;
}

export interface ToolApprovalDecisionRequest {
  note?: string | null;
}

export interface ToolApprovalListFilters {
  agent_id?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
}

// ============================================================================
// Triggers
// ============================================================================

export type TriggerType = 'event' | 'once' | 'schedule';

export interface TriggerConfig {
  type: TriggerType;
  event_source?: string;
  event?: string;
  cron?: string;
  description?: string;
  prompt?: string;
  [key: string]: any;
}

export interface TriggerField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  help?: string;
  font?: string;
}

export interface TriggerSpec {
  id: string;
  version: string;
  name: string;
  description: string;
  type: TriggerType;
  fields: TriggerField[];
}

export interface TriggerRunRequest {
  prompt?: string;
  [key: string]: any;
}

export interface TriggerRunResult {
  status: string;
  output?: string | null;
  workflow_id?: string | null;
  [key: string]: any;
}

export interface WebhookInfo {
  webhook_url: string;
  agent_id: string;
  methods: string[];
  content_type: string;
  event_source?: string | null;
  description?: string | null;
}

export interface WebhookResponse {
  status: string;
  agent_id: string;
  workflow_id?: string | null;
  message?: string | null;
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationField {
  name: string;
  label: string;
  type: 'string' | 'boolean';
  required: boolean;
  placeholder?: string;
  default?: any;
}

export interface NotificationChannelSpec {
  id: string;
  version: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  coming_soon: boolean;
  fields: NotificationField[];
}

export interface NotificationConfig {
  channel: string;
  [key: string]: any;
}

export interface CreateNotificationRequest {
  agent_id: string;
  title: string;
  message?: string;
  level?: 'info' | 'warning' | 'error' | 'success';
  category?: string;
  [key: string]: any;
}

// ============================================================================
// Context Introspection
// ============================================================================

export interface ContextDetails {
  total_tokens?: number;
  used_tokens?: number;
  [key: string]: any;
}

export interface ContextSnapshot {
  agentId: string;
  systemPrompts: any[];
  systemPromptTokens: number;
  messages: any[];
  userMessageTokens: number;
  assistantMessageTokens: number;
  totalTokens: number;
  contextWindow: number;
  distribution: any;
  toolTokens?: number;
  per_request_usage?: any[];
  [key: string]: any;
}

export interface FullContextSnapshot {
  agentId: string;
  modelConfiguration: {
    modelName: string | null;
    contextWindow: number;
    settings: Record<string, any>;
  };
  systemPrompts: any[];
  systemPromptTokens: number;
  tools: any[];
  toolTokens: number;
  messages: any[];
  memoryBlocks: any[];
  memoryTokens: number;
  toolEnvironment: Record<string, any>;
  toolRules: any[];
  tokenSummary: {
    systemPrompts: number;
    tools: number;
    memory: number;
    history: number;
    current: number;
    total: number;
    contextWindow: number;
    usagePercent: number;
  };
}

export interface ContextExport {
  agentId: string;
  filename: string;
  csv: string;
  stepsCount: number;
}

export interface ContextTableResponse {
  agentId: string;
  table: string;
  error?: string;
}

// ============================================================================
// Conversation History
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  [key: string]: any;
}

export interface ConversationHistory {
  agent_id: string;
  messages: ConversationMessage[];
  [key: string]: any;
}

export interface HistoryUpsertRequest {
  agent_id: string;
  messages: ConversationMessage[];
  [key: string]: any;
}

// ============================================================================
// Sandbox / Codemode
// ============================================================================

export interface SandboxStatus {
  variant: string;
  jupyter_url?: string | null;
  jupyter_connected?: boolean;
  jupyter_error?: string | null;
  sandbox_running: boolean;
  is_executing: boolean;
  generated_path?: string | null;
  skills_path?: string | null;
  python_path?: string | null;
  mcp_proxy_url?: string | null;
}

export interface CodemodeStatus {
  enabled: boolean;
  skills: CodemodeSkill[];
  available_skills: CodemodeSkill[];
  sandbox?: SandboxStatus | null;
}

export interface CodemodeSkill {
  name: string;
  description?: string;
  tags?: string[];
}

export interface CodemodeToggleRequest {
  enabled: boolean;
  skills?: string[] | null;
}

export interface ConfigureSandboxRequest {
  variant?: string;
  jupyter_url?: string;
  jupyter_token?: string;
  [key: string]: any;
}

// ============================================================================
// MCP Server Management
// ============================================================================

export interface MCPCatalogEntry {
  name: string;
  description?: string;
  transport: 'stdio' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  required_env_vars?: string[];
  icon?: string;
  emoji?: string;
  [key: string]: any;
}

export interface MCPToolsetsStatus {
  initialized: boolean;
  ready_count: number;
  failed_count: number;
  ready_servers: string[];
  failed_servers: Record<string, string>;
  servers: any[];
}

export interface MCPServerStartRequest {
  servers?: string[];
  [key: string]: any;
}

export interface MCPServerStartResponse {
  started: string[];
  failed: Record<string, string>;
  already_running: string[];
  [key: string]: any;
}

// ============================================================================
// Transport
// ============================================================================

export type AgentProtocol = 'vercel-ai' | 'ag-ui' | 'a2a' | 'mcp-ui' | 'acp';

export interface UpdateTransportRequest {
  protocol: AgentProtocol;
  [key: string]: any;
}

export interface UpdateMCPServersRequest {
  mcp_servers: any[];
  [key: string]: any;
}

// ============================================================================
// Guardrails
// ============================================================================

export interface GuardrailSpec {
  id: string;
  version?: string;
  name: string;
  description?: string;
  permissions?: GuardrailPermissions;
  token_limits?: TokenLimits;
  data_scope?: any;
  data_handling?: any;
  approval_policy?: any;
  tool_limits?: any;
  audit?: any;
}

export interface GuardrailPermissions {
  read_data?: boolean;
  write_data?: boolean;
  execute_code?: boolean;
  send_messages?: boolean;
  manage_resources?: boolean;
  access_external?: boolean;
}

export interface TokenLimits {
  per_run?: number;
  per_day?: number;
  per_month?: number;
}

// ============================================================================
// Agent Notifications (runtime notifications, not channel specs)
// ============================================================================

export interface AgentNotification {
  id: string;
  agent_id: string;
  title: string;
  message?: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category?: string;
  read: boolean;
  created_at: string;
  [key: string]: any;
}

export interface NotificationListFilters {
  agentId?: string;
  level?: string;
  unreadOnly?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Agent Events
// ============================================================================

export interface AgentEvent {
  id: string;
  agent_id: string;
  event_type: string;
  title: string;
  message?: string;
  level?: string;
  read?: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CreateAgentEventRequest {
  agent_id: string;
  event_type?: string;
  title: string;
  message?: string;
  level?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface UpdateAgentEventRequest {
  title?: string;
  message?: string;
  level?: string;
  read?: boolean;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface ListAgentEventsParams {
  agent_id?: string;
  event_type?: string;
  level?: string;
  limit?: number;
  offset?: number;
  [key: string]: any;
}

export interface ListAgentEventsResponse {
  events: AgentEvent[];
  total?: number;
  [key: string]: any;
}

// ============================================================================
// Output Artifacts
// ============================================================================

export interface OutputArtifact {
  id: string;
  agent_id: string;
  format: string;
  filename?: string;
  url?: string;
  size?: number;
  created_at: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// ============================================================================
// Evaluations
// ============================================================================

export interface RunEvalsRequest {
  eval_ids?: string[];
  model?: string;
  [key: string]: any;
}

export interface EvalReport {
  id: string;
  agent_id: string;
  status: string;
  results?: any[];
  score?: number;
  created_at: string;
  completed_at?: string;
  [key: string]: any;
}

// ============================================================================
// Skills
// ============================================================================

export interface SkillInfo {
  name: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

export interface SkillsResponse {
  skills: SkillInfo[];
  total: number;
}

// ============================================================================
// Durable Agents (pause/resume/checkpoints/usage)
// ============================================================================

export interface RunningAgent {
  agentId: string;
  podName: string;
  name?: string;
  specId?: string;
  status: string;
  model?: string;
  createdAt?: string;
  turnCount?: number;
  totalTokens?: number;
  totalCostUsd?: number;
  durableEnabled?: boolean;
  [key: string]: any;
}

export interface AgentUsageSummary {
  agent_id: string;
  total_tokens?: number;
  total_cost_usd?: number;
  turn_count?: number;
  [key: string]: any;
}

export interface ConversationCheckpoint {
  id: string;
  agent_id: string;
  messages: ConversationMessage[];
  created_at: string;
  [key: string]: any;
}

// ============================================================================
// Context Usage & Cost
// ============================================================================

export interface ContextUsage {
  agent_id: string;
  context_window: number;
  used_tokens: number;
  input_tokens?: number;
  output_tokens?: number;
  [key: string]: any;
}

export interface CostUsage {
  agent_id: string;
  total_cost_usd: number;
  input_cost_usd?: number;
  output_cost_usd?: number;
  [key: string]: any;
}
