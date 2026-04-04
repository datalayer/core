/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Configured AI Agents client that handles platform vs local path resolution.
 *
 * Provides a unified API surface that works transparently against both
 * the Datalayer platform (`/api/ai-agents/v1`) and local agent-runtimes
 * instances (`/api/v1`).
 *
 * @module api/ai-agents/client
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';
import type {
  // Health
  HealthStatus,
  ReadinessStatus,
  StartupInfo,
  // Agents
  AgentInfo,
  AgentListResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  UpdateTransportRequest,
  UpdateMCPServersRequest,
  AgentUsageSummary,
  ConversationCheckpoint,
  ContextUsage,
  CostUsage,
  // Library
  AgentSpec,
  // Configuration
  FrontendConfig,
  // Tool Approvals
  ToolApprovalRecord,
  ToolApprovalCreateRequest,
  ToolApprovalDecisionRequest,
  ToolApprovalListFilters,
  // Context
  ContextDetails,
  ContextSnapshot,
  FullContextSnapshot,
  ContextExport,
  ContextTableResponse,
  // History
  ConversationHistory,
  HistoryUpsertRequest,
  // Sandbox
  SandboxStatus,
  CodemodeStatus,
  CodemodeToggleRequest,
  ConfigureSandboxRequest,
  // MCP
  MCPCatalogEntry,
  MCPServerInfo,
  MCPServerStartRequest,
  MCPServerStartResponse,
  // Triggers
  TriggerRunRequest,
  TriggerRunResult,
  WebhookInfo,
  WebhookResponse,
  // Notifications
  AgentNotification,
  NotificationListFilters,
  CreateNotificationRequest,
  // Events
  AgentEvent,
  CreateAgentEventRequest,
  UpdateAgentEventRequest,
  ListAgentEventsParams,
  ListAgentEventsResponse,
  // Output
  OutputArtifact,
  // Evals
  EvalReport,
  RunEvalsRequest,
  // Skills
  SkillInfo,
  SkillsResponse,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/** Target type determines the base path and path variants used. */
export type AIAgentsTargetType = 'platform' | 'local';

/** Configuration for creating an AI Agents client. */
export interface AIAgentsClientConfig {
  /** Authentication token (JWT). */
  token: string;
  /** Server base URL. Defaults to the platform URL. */
  baseUrl?: string;
  /**
   * Target type.
   * - `'platform'` (default): uses `/api/ai-agents/v1` base path
   * - `'local'`: uses `/api/v1` base path and local path variants
   */
  type?: AIAgentsTargetType;
}

// ============================================================================
// Path resolution
// ============================================================================

interface PathConfig {
  basePath: string;
  webhookPath: (agentId: string) => string;
  markAllNotificationsReadPath: string;
}

const PLATFORM_PATHS: PathConfig = {
  basePath: '/api/ai-agents/v1',
  webhookPath: (id: string) => `/webhooks/${encodeURIComponent(id)}`,
  markAllNotificationsReadPath: '/notifications/mark-all-read',
};

const LOCAL_PATHS: PathConfig = {
  basePath: '/api/v1',
  webhookPath: (id: string) => `/agents/${encodeURIComponent(id)}/webhook`,
  markAllNotificationsReadPath: '/notifications/read-all',
};

function getPathConfig(type: AIAgentsTargetType): PathConfig {
  return type === 'local' ? LOCAL_PATHS : PLATFORM_PATHS;
}

// ============================================================================
// Internal helpers
// ============================================================================

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function createRequester(token: string, baseUrl: string, paths: PathConfig) {
  const request = <T>(method: Method, path: string, body?: any): Promise<T> => {
    return requestDatalayerAPI<T>({
      url: `${baseUrl}${paths.basePath}${path}`,
      method,
      body,
      token,
    });
  };

  const enc = encodeURIComponent;

  return { request, enc, paths };
}

// ============================================================================
// Module builders
// ============================================================================

function buildHealth(r: ReturnType<typeof createRequester>) {
  return {
    check: () => r.request<HealthStatus>('GET', '/health'),
    readiness: () => r.request<ReadinessStatus>('GET', '/health/ready'),
    liveness: () => r.request<HealthStatus>('GET', '/health/live'),
    startup: () => r.request<StartupInfo>('GET', '/health/startup'),
    ping: () => r.request<Record<string, any>>('GET', '/ping'),
  };
}

function buildAgents(r: ReturnType<typeof createRequester>) {
  return {
    list: () => r.request<AgentListResponse>('GET', '/agents'),
    get: (agentId: string) =>
      r.request<AgentInfo>('GET', `/agents/${r.enc(agentId)}`),
    create: (req: CreateAgentRequest) =>
      r.request<CreateAgentResponse>('POST', '/agents', req),
    delete: (agentId: string) =>
      r.request<{ status: string }>('DELETE', `/agents/${r.enc(agentId)}`),
    patch: (agentId: string, body: Record<string, any>) =>
      r.request<any>('PATCH', `/agents/${r.enc(agentId)}`, body),
    updateTransport: (agentId: string, req: UpdateTransportRequest) =>
      r.request<any>('PATCH', `/agents/${r.enc(agentId)}/transport`, req),
    updateMCPServers: (agentId: string, req: UpdateMCPServersRequest) =>
      r.request<any>('PATCH', `/agents/${r.enc(agentId)}/mcp-servers`, req),
    configureFromSpec: (spec: Record<string, any>) =>
      r.request<any>('POST', '/agents/configure-from-spec', spec),
    // Durable lifecycle
    pause: (podName: string) =>
      r.request<void>('POST', `/agents/${r.enc(podName)}/pause`),
    resume: (podName: string) =>
      r.request<void>('POST', `/agents/${r.enc(podName)}/resume`),
    getCheckpoints: (podName: string, agentId?: string) => {
      const q = agentId ? `?agent_id=${r.enc(agentId)}` : '';
      return r.request<ConversationCheckpoint[]>(
        'GET',
        `/agents/${r.enc(podName)}/checkpoints${q}`,
      );
    },
    getUsage: (podName: string, agentId?: string) => {
      const q = agentId ? `?agent_id=${r.enc(agentId)}` : '';
      return r.request<AgentUsageSummary>(
        'GET',
        `/agents/${r.enc(podName)}/usage${q}`,
      );
    },
    getContextUsage: (agentId: string) =>
      r.request<ContextUsage>('GET', `/agents/${r.enc(agentId)}/context-usage`),
    getCostUsage: (agentId: string) =>
      r.request<CostUsage>('GET', `/agents/${r.enc(agentId)}/cost-usage`),
  };
}

function buildLibrary(r: ReturnType<typeof createRequester>) {
  return {
    list: () => r.request<AgentSpec[]>('GET', '/agents/library'),
    get: (agentId: string) =>
      r.request<AgentSpec>('GET', `/agents/library/${r.enc(agentId)}`),
  };
}

function buildConfiguration(r: ReturnType<typeof createRequester>) {
  return {
    getFrontendConfig: (mcpUrl?: string, mcpToken?: string) => {
      const params = new URLSearchParams();
      if (mcpUrl) params.set('mcp_url', mcpUrl);
      if (mcpToken) params.set('mcp_token', mcpToken);
      const q = params.toString() ? `?${params.toString()}` : '';
      return r.request<FrontendConfig>('GET', `/configure${q}`);
    },
    getAgentCreationSpec: (agentId: string) =>
      r.request<Record<string, any>>(
        'GET',
        `/configure/agents/${r.enc(agentId)}/spec`,
      ),
    getMCPToolsetsStatus: () =>
      r.request<Record<string, any>>('GET', '/configure/mcp-toolsets-status'),
    getMCPToolsetsInfo: () =>
      r.request<Record<string, any>[]>('GET', '/configure/mcp-toolsets-info'),
  };
}

function buildToolApprovals(r: ReturnType<typeof createRequester>) {
  return {
    list: (filters?: ToolApprovalListFilters) => {
      const params = new URLSearchParams();
      if (filters?.agent_id) params.set('agent_id', filters.agent_id);
      if (filters?.status) params.set('status', filters.status);
      const q = params.toString() ? `?${params.toString()}` : '';
      return r.request<ToolApprovalRecord[]>('GET', `/tool-approvals${q}`);
    },
    get: (id: string) =>
      r.request<ToolApprovalRecord>('GET', `/tool-approvals/${r.enc(id)}`),
    create: (req: ToolApprovalCreateRequest) =>
      r.request<ToolApprovalRecord>('POST', '/tool-approvals', req),
    approve: (id: string, note?: string | null) => {
      const body: ToolApprovalDecisionRequest = { note: note ?? null };
      return r.request<ToolApprovalRecord>(
        'POST',
        `/tool-approvals/${r.enc(id)}/approve`,
        body,
      );
    },
    reject: (id: string, note?: string | null) => {
      const body: ToolApprovalDecisionRequest = { note: note ?? null };
      return r.request<ToolApprovalRecord>(
        'POST',
        `/tool-approvals/${r.enc(id)}/reject`,
        body,
      );
    },
    markRead: (id: string) =>
      r.request<void>('POST', `/tool-approvals/${r.enc(id)}/mark-read`),
    markUnread: (id: string) =>
      r.request<void>('POST', `/tool-approvals/${r.enc(id)}/mark-unread`),
    delete: (id: string) =>
      r.request<void>('DELETE', `/tool-approvals/${r.enc(id)}`),
    getPendingCount: () =>
      r.request<{ count: number }>('GET', '/tool-approvals/pending/count'),
  };
}

function buildContext(r: ReturnType<typeof createRequester>) {
  return {
    getDetails: (agentId: string) =>
      r.request<ContextDetails>(
        'GET',
        `/configure/agents/${r.enc(agentId)}/context-details`,
      ),
    getSnapshot: (agentId: string) =>
      r.request<ContextSnapshot>(
        'GET',
        `/configure/agents/${r.enc(agentId)}/context-snapshot`,
      ),
    getTable: (agentId: string, showContext = true) => {
      const q = showContext ? '' : '?show_context=false';
      return r.request<ContextTableResponse>(
        'GET',
        `/configure/agents/${r.enc(agentId)}/context-table${q}`,
      );
    },
    getFullContext: (agentId: string) =>
      r.request<FullContextSnapshot>(
        'GET',
        `/configure/agents/${r.enc(agentId)}/full-context`,
      ),
    exportCSV: (agentId: string) =>
      r.request<ContextExport>(
        'GET',
        `/configure/agents/${r.enc(agentId)}/context-export`,
      ),
    reset: (agentId: string) =>
      r.request<{ status: string }>(
        'POST',
        `/configure/agents/${r.enc(agentId)}/context-details/reset`,
      ),
  };
}

function buildHistory(r: ReturnType<typeof createRequester>) {
  return {
    get: (agentId = 'default') =>
      r.request<ConversationHistory>(
        'GET',
        `/history?agent_id=${r.enc(agentId)}`,
      ),
    upsert: (req: HistoryUpsertRequest) =>
      r.request<Record<string, any>>('POST', '/history', req),
    clear: (agentId = 'default') =>
      r.request<Record<string, any>>(
        'DELETE',
        `/history?agent_id=${r.enc(agentId)}`,
      ),
  };
}

function buildSandbox(r: ReturnType<typeof createRequester>) {
  return {
    getCodemodeStatus: () =>
      r.request<CodemodeStatus>('GET', '/configure/codemode-status'),
    toggleCodemode: (req: CodemodeToggleRequest) =>
      r.request<Record<string, any>>('POST', '/configure/codemode/toggle', req),
    getStatus: () =>
      r.request<SandboxStatus & { available: boolean }>(
        'GET',
        '/configure/sandbox-status',
      ),
    interrupt: (agentId?: string) => {
      const q = agentId ? `?agent_id=${r.enc(agentId)}` : '';
      return r.request<{ interrupted: boolean; reason?: string }>(
        'POST',
        `/configure/sandbox/interrupt${q}`,
      );
    },
    getAgentSandboxStatus: () =>
      r.request<Record<string, any>>('GET', '/agents/sandbox/status'),
    configure: (req: ConfigureSandboxRequest) =>
      r.request<Record<string, any>>('POST', '/agents/sandbox/configure', req),
    restart: () =>
      r.request<Record<string, any>>('POST', '/agents/sandbox/restart'),
  };
}

function buildMcp(r: ReturnType<typeof createRequester>) {
  return {
    listCatalog: () =>
      r.request<MCPCatalogEntry[]>('GET', '/mcp/servers/catalog'),
    listAvailable: () =>
      r.request<MCPServerInfo[]>('GET', '/mcp/servers/available'),
    getConfigServers: () =>
      r.request<MCPServerInfo[]>('GET', '/mcp/servers/config'),
    enableCatalogServer: (name: string) =>
      r.request<Record<string, any>>(
        'POST',
        `/mcp/servers/catalog/${r.enc(name)}/enable`,
      ),
    startForAgent: (agentId: string, req?: MCPServerStartRequest) =>
      r.request<MCPServerStartResponse>(
        'POST',
        `/agents/${r.enc(agentId)}/mcp-servers/start`,
        req ?? {},
      ),
    stopForAgent: (agentId: string) =>
      r.request<Record<string, any>>(
        'POST',
        `/agents/${r.enc(agentId)}/mcp-servers/stop`,
      ),
    startAll: (req?: MCPServerStartRequest) =>
      r.request<MCPServerStartResponse>(
        'POST',
        '/agents/mcp-servers/start',
        req ?? {},
      ),
    stopAll: () =>
      r.request<Record<string, any>>('POST', '/agents/mcp-servers/stop'),
  };
}

function buildTriggers(r: ReturnType<typeof createRequester>) {
  return {
    run: (agentId: string, req?: TriggerRunRequest) =>
      r.request<TriggerRunResult>(
        'POST',
        `/agents/${r.enc(agentId)}/trigger/run`,
        req ?? {},
      ),
    getWebhookInfo: (agentId: string) =>
      r.request<WebhookInfo>('GET', r.paths.webhookPath(agentId)),
    fireWebhook: (agentId: string, payload: Record<string, any>) =>
      r.request<WebhookResponse>('POST', r.paths.webhookPath(agentId), payload),
    getWebhookHistory: (agentId: string) =>
      r.request<Record<string, any>>(
        'GET',
        `${r.paths.webhookPath(agentId)}/history`,
      ),
  };
}

function buildNotifications(r: ReturnType<typeof createRequester>) {
  return {
    list: (filters?: NotificationListFilters) => {
      const params = new URLSearchParams();
      if (filters?.agentId) params.set('agent_id', filters.agentId);
      if (filters?.level) params.set('level', filters.level);
      if (filters?.unreadOnly) params.set('unread_only', 'true');
      if (filters?.category) params.set('category', filters.category);
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));
      const q = params.toString() ? `?${params.toString()}` : '';
      return r.request<AgentNotification[]>('GET', `/notifications${q}`);
    },
    get: (id: string) =>
      r.request<AgentNotification>('GET', `/notifications/${r.enc(id)}`),
    create: (req: CreateNotificationRequest) =>
      r.request<AgentNotification>('POST', '/notifications', req),
    markRead: (id: string) =>
      r.request<void>('POST', `/notifications/${r.enc(id)}/read`),
    markAllRead: (agentId?: string) => {
      const body = agentId ? { agent_id: agentId } : {};
      return r.request<void>(
        'POST',
        r.paths.markAllNotificationsReadPath,
        body,
      );
    },
    getUnreadCount: () =>
      r.request<{ count: number }>('GET', '/notifications/unread/count'),
  };
}

function buildEvents(r: ReturnType<typeof createRequester>) {
  const evPath = (agentId: string) => `/agents/${r.enc(agentId)}/events`;

  return {
    listAll: (params?: Omit<ListAgentEventsParams, 'agent_id'>) => {
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '')
            sp.append(k, String(v));
        });
      }
      const q = sp.toString() ? `?${sp.toString()}` : '';
      return r.request<ListAgentEventsResponse>('GET', `/events${q}`);
    },
    list: (
      agentId: string,
      params?: Omit<ListAgentEventsParams, 'agent_id'>,
    ) => {
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '')
            sp.append(k, String(v));
        });
      }
      const q = sp.toString() ? `?${sp.toString()}` : '';
      return r.request<ListAgentEventsResponse>(
        'GET',
        `${evPath(agentId)}${q}`,
      );
    },
    get: (agentId: string, eventId: string) =>
      r.request<AgentEvent>('GET', `${evPath(agentId)}/${r.enc(eventId)}`),
    create: (data: CreateAgentEventRequest) =>
      r.request<{ success: boolean; event: AgentEvent }>(
        'POST',
        evPath(data.agent_id),
        data,
      ),
    update: (agentId: string, eventId: string, data: UpdateAgentEventRequest) =>
      r.request<AgentEvent>(
        'PATCH',
        `${evPath(agentId)}/${r.enc(eventId)}`,
        data,
      ),
    delete: (agentId: string, eventId: string) =>
      r.request<{ success: boolean }>(
        'DELETE',
        `${evPath(agentId)}/${r.enc(eventId)}`,
      ),
    markRead: (agentId: string, eventId: string) =>
      r.request<AgentEvent>(
        'POST',
        `${evPath(agentId)}/${r.enc(eventId)}/mark-read`,
      ),
    markUnread: (agentId: string, eventId: string) =>
      r.request<AgentEvent>(
        'POST',
        `${evPath(agentId)}/${r.enc(eventId)}/mark-unread`,
      ),
  };
}

function buildOutput(r: ReturnType<typeof createRequester>) {
  return {
    list: (agentId: string) =>
      r.request<OutputArtifact[]>('GET', `/agents/${r.enc(agentId)}/output`),
    get: (agentId: string, artifactId: string) =>
      r.request<OutputArtifact>(
        'GET',
        `/agents/${r.enc(agentId)}/output/${r.enc(artifactId)}`,
      ),
    generate: (
      agentId: string,
      format = 'pdf',
      options?: Record<string, unknown>,
    ) =>
      r.request<OutputArtifact>(
        'POST',
        `/agents/${r.enc(agentId)}/output/generate`,
        { format, ...options },
      ),
  };
}

function buildEvals(r: ReturnType<typeof createRequester>) {
  return {
    run: (agentId: string, req: RunEvalsRequest) =>
      r.request<EvalReport>('POST', `/agents/${r.enc(agentId)}/evals/run`, req),
    list: (agentId: string) =>
      r.request<EvalReport[]>('GET', `/agents/${r.enc(agentId)}/evals`),
    get: (agentId: string, evalId: string) =>
      r.request<EvalReport>(
        'GET',
        `/agents/${r.enc(agentId)}/evals/${r.enc(evalId)}`,
      ),
  };
}

function buildSkills(r: ReturnType<typeof createRequester>) {
  return {
    list: () => r.request<SkillsResponse>('GET', '/skills'),
    get: (skillId: string) =>
      r.request<SkillInfo>('GET', `/skills/${r.enc(skillId)}`),
    getContent: (skillId: string) =>
      r.request<Record<string, any>>(
        'GET',
        `/skills/${r.enc(skillId)}/content`,
      ),
  };
}

function buildIdentity(r: ReturnType<typeof createRequester>) {
  return {
    exchangeOAuthToken: (code: string, provider: string, redirectUri: string) =>
      r.request<Record<string, any>>('POST', '/identity/oauth/token', {
        code,
        provider,
        redirect_uri: redirectUri,
      }),
    getOAuthUserInfo: (provider: string, accessToken: string) =>
      r.request<Record<string, any>>('POST', '/identity/oauth/userinfo', {
        provider,
        access_token: accessToken,
      }),
  };
}

// ============================================================================
// Client type and factory
// ============================================================================

/** AI Agents client with all API modules. */
export interface AIAgentsClient {
  /** The resolved configuration. */
  readonly config: Required<AIAgentsClientConfig>;

  /** Health, ping, version. */
  readonly health: ReturnType<typeof buildHealth>;
  /** Agent CRUD + durable lifecycle. */
  readonly agents: ReturnType<typeof buildAgents>;
  /** Agent spec library (templates). */
  readonly library: ReturnType<typeof buildLibrary>;
  /** Frontend configuration. */
  readonly configuration: ReturnType<typeof buildConfiguration>;
  /** Tool approval CRUD + approve/reject. */
  readonly toolApprovals: ReturnType<typeof buildToolApprovals>;
  /** Context introspection. */
  readonly context: ReturnType<typeof buildContext>;
  /** Conversation history. */
  readonly history: ReturnType<typeof buildHistory>;
  /** Sandbox and codemode management. */
  readonly sandbox: ReturnType<typeof buildSandbox>;
  /** MCP server management. */
  readonly mcp: ReturnType<typeof buildMcp>;
  /** Triggers and webhooks. */
  readonly triggers: ReturnType<typeof buildTriggers>;
  /** Agent notifications. */
  readonly notifications: ReturnType<typeof buildNotifications>;
  /** Agent events. */
  readonly events: ReturnType<typeof buildEvents>;
  /** Output artifacts. */
  readonly output: ReturnType<typeof buildOutput>;
  /** Evaluation runs. */
  readonly evals: ReturnType<typeof buildEvals>;
  /** Skills. */
  readonly skills: ReturnType<typeof buildSkills>;
  /** Identity / OAuth. */
  readonly identity: ReturnType<typeof buildIdentity>;
}

/**
 * Create a configured AI Agents client.
 *
 * The client handles platform vs local path resolution transparently.
 * All methods are pre-bound with the token and base URL.
 *
 * @param config - Client configuration (token, baseUrl, type)
 * @returns Configured client with all API modules
 *
 * @example
 * ```typescript
 * // Platform (default)
 * const platform = createAIAgentsClient({ token });
 *
 * // Local agent-runtimes
 * const local = createAIAgentsClient({
 *   token,
 *   baseUrl: 'http://localhost:8765',
 *   type: 'local',
 * });
 *
 * // Same API, different targets
 * await platform.agents.list();
 * await local.sandbox.getStatus();
 * ```
 */
export function createAIAgentsClient(
  config: AIAgentsClientConfig,
): AIAgentsClient {
  validateToken(config.token);

  const resolved: Required<AIAgentsClientConfig> = {
    token: config.token,
    baseUrl: config.baseUrl ?? DEFAULT_SERVICE_URLS.AI_AGENTS,
    type: config.type ?? 'platform',
  };

  const paths = getPathConfig(resolved.type);
  const r = createRequester(resolved.token, resolved.baseUrl, paths);

  return {
    config: resolved,
    health: buildHealth(r),
    agents: buildAgents(r),
    library: buildLibrary(r),
    configuration: buildConfiguration(r),
    toolApprovals: buildToolApprovals(r),
    context: buildContext(r),
    history: buildHistory(r),
    sandbox: buildSandbox(r),
    mcp: buildMcp(r),
    triggers: buildTriggers(r),
    notifications: buildNotifications(r),
    events: buildEvents(r),
    output: buildOutput(r),
    evals: buildEvals(r),
    skills: buildSkills(r),
    identity: buildIdentity(r),
  };
}
