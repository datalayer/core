/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Hooks over the Jupyter MCP Server, IAM's connected agents and the OTEL
 * service, in the `useContents.ts` shape: `enabled` on token and URL,
 * `staleTime` per resource, filters in the query key, mutations that
 * `setQueryData` and invalidate.
 *
 * Polling by predicate: a task refetches every two seconds while it is not
 * terminal and stops when it is; the activity answer every ten seconds as
 * the fallback under the websocket; audit and policy on demand. An open
 * Runs panel subscribes to the task's server-sent events instead.
 *
 * @module hooks/useMcp
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  answerTask,
  cancelTask,
  exportAuditEvents,
  fetchMcpLogs,
  fetchMcpMetrics,
  fetchRunTrace,
  fetchTraceSpans,
  getEffectivePolicy,
  getGatewayVersion,
  getMcpActivity,
  getOrganizationMcpOverview,
  getTask,
  getWorkflowsHealth,
  isMcpTaskTerminal,
  listAuditEvents,
  listBindings,
  listNotebookTasks,
  listTasks,
  listWorkers,
  subscribeTaskEvents,
  terminateBinding,
  type McpActivity,
  type McpActivityFilters,
  type McpAuditFilters,
  type McpBindingListFilters,
  type McpGatewayVersion,
  type McpMetricsFilters,
  type McpMetricsSnapshot,
  type McpOrganizationOverview,
  type McpOrganizationOverviewFilters,
  type McpPolicyFilters,
  type McpRunLogs,
  type McpRunTrace,
  type McpTaskEvent,
  type McpTaskListFilters,
  type McpWorkerList,
  type McpWorkflowsHealth,
} from '../api/mcp';
import { disconnectAgent, listConnectedAgents, type ConnectedAgent } from '../api/iam/connectedAgents';
import type { McpAuditEventList, McpAuditExportFormat } from '../models/McpAuditEvent';
import type { McpBinding, McpBindingList } from '../models/McpBinding';
import type { McpEffectivePolicy } from '../models/McpPolicy';
import type { McpTask, McpTaskList } from '../models/McpTask';
import { useCoreStore, useIAMStore } from '../state';
import { queryKeys } from './useCache';

const useMcpServerUrl = () =>
  useCoreStore(state => state.configuration.jupyterMcpServerUrl);

const useIamUrl = () => useCoreStore(state => state.configuration.iamUrl);

const useOtelUrl = () => useCoreStore(state => state.configuration.otelUrl);

// -- Tasks -----------------------------------------------------------------

export const useTasks = (
  filters: McpTaskListFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpTaskList>({
    queryKey: queryKeys.mcp.taskList(filters),
    queryFn: () => listTasks(token ?? '', filters, mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 5_000,
    refetchInterval: filters.status && !isMcpTaskTerminal(filters.status) ? 5_000 : false,
  });
};

/** One task, polled every two seconds until it is terminal. */
export const useTask = (taskUid?: string) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpTask>({
    queryKey: queryKeys.mcp.task(taskUid ?? ''),
    queryFn: () => getTask(token ?? '', taskUid!, mcpUrl),
    enabled: Boolean(token && mcpUrl && taskUid),
    refetchInterval: query =>
      query.state.data && isMcpTaskTerminal(query.state.data.status) ? false : 2_000,
  });
};

export const useNotebookTasks = (
  notebookUid?: string,
  filters: Pick<McpTaskListFilters, 'status' | 'cursor' | 'limit'> = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpTaskList>({
    queryKey: queryKeys.mcp.notebookTasks(notebookUid ?? '', filters),
    queryFn: () => listNotebookTasks(token ?? '', notebookUid!, filters, mcpUrl),
    enabled: Boolean(token && mcpUrl && notebookUid),
    staleTime: 5_000,
  });
};

/**
 * The task's server-sent events, patched into the task's cache entry so
 * every `useTask` of it updates without polling. Ends by itself when the
 * task is terminal; the subscription closes with the component.
 */
export const useTaskEvents = (
  taskUid?: string,
  options: { enabled?: boolean; onEvent?: (event: McpTaskEvent) => void } = {},
) => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  const enabled = Boolean(token && mcpUrl && taskUid) && (options.enabled ?? true);
  const { onEvent } = options;
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const close = subscribeTaskEvents(
      token ?? '',
      taskUid!,
      {
        onEvent: event => {
          queryClient.setQueryData<McpTask>(queryKeys.mcp.task(taskUid!), current => {
            if (event.task) {
              return event.task;
            }
            if (!current) {
              return current;
            }
            return {
              ...current,
              status: event.status ?? current.status,
              statusMessage: event.statusMessage ?? current.statusMessage,
              lastUpdatedAt: event.at ?? current.lastUpdatedAt,
              outputs: event.output ? [...(current.outputs ?? []), event.output] : current.outputs,
            };
          });
          onEvent?.(event);
        },
        onClose: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.mcp.task(taskUid!) });
          queryClient.invalidateQueries({ queryKey: queryKeys.mcp.tasks() });
        },
      },
      mcpUrl,
    );
    return close;
  }, [enabled, token, taskUid, mcpUrl, queryClient, onEvent]);
};

export const useCancelTask = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useMutation<McpTask, Error, string>({
    mutationFn: taskUid => cancelTask(token ?? '', taskUid, mcpUrl),
    onSuccess: task => {
      queryClient.setQueryData(queryKeys.mcp.task(task.uid), task);
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.activity() });
    },
  });
};

export const useAnswerTask = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useMutation<McpTask, Error, { taskUid: string; input: Record<string, unknown> }>({
    mutationFn: ({ taskUid, input }) =>
      answerTask(token ?? '', taskUid, { input }, crypto.randomUUID(), mcpUrl),
    onSuccess: task => {
      queryClient.setQueryData(queryKeys.mcp.task(task.uid), task);
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.tasks() });
    },
  });
};

// -- Bindings --------------------------------------------------------------

export const useBindings = (
  filters: McpBindingListFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpBindingList>({
    queryKey: queryKeys.mcp.bindingList(filters),
    queryFn: () => listBindings(token ?? '', filters, mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 10_000,
  });
};

export const useTerminateBinding = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useMutation<McpBinding, Error, string>({
    mutationFn: bindingUid => terminateBinding(token ?? '', bindingUid, mcpUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.bindings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.activity() });
    },
  });
};

// -- Activity --------------------------------------------------------------

/**
 * What is going on for the caller, refetched every ten seconds as the
 * fallback under the ai-agents websocket, which patches the same entry.
 */
export const useMcpActivity = (
  filters: McpActivityFilters = {},
  options: { enabled?: boolean; pollIntervalMs?: number | false } = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpActivity>({
    queryKey: queryKeys.mcp.activity(filters),
    queryFn: () => getMcpActivity(token ?? '', filters, mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 5_000,
    refetchInterval: options.pollIntervalMs ?? 10_000,
    refetchIntervalInBackground: false,
  });
};

// -- Audit -----------------------------------------------------------------

/** One page of the audit log; the cursor is one of the filters, as the URL keeps it. */
export const useAuditEvents = (
  filters: McpAuditFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpAuditEventList>({
    queryKey: queryKeys.mcp.auditList(filters),
    queryFn: () => listAuditEvents(token ?? '', filters, mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 30_000,
    placeholderData: previous => previous,
  });
};

/** The whole selection as one JSONL or CSV document, on demand. */
export const useAuditExport = () => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useMutation<
    string,
    Error,
    { filters?: Omit<McpAuditFilters, 'cursor' | 'limit'>; format?: McpAuditExportFormat }
  >({
    mutationFn: ({ filters = {}, format = 'jsonl' }) =>
      exportAuditEvents(token ?? '', filters, format, mcpUrl),
  });
};

// -- Policy ----------------------------------------------------------------

/** The effective policy for the caller, or previewed as one agent. */
export const useEffectivePolicy = (
  agent?: string,
  filters: Omit<McpPolicyFilters, 'agent'> = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  const policyFilters = { agent, ...filters };
  return useQuery<McpEffectivePolicy>({
    queryKey: queryKeys.mcp.policy(policyFilters),
    queryFn: () => getEffectivePolicy(token ?? '', policyFilters, mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 60_000,
  });
};

// -- Organizations (the Enterprise console) --------------------------------

/**
 * The organization's MCP overview, for the console's first page.
 *
 * Read on demand and kept for a minute: an administrator reads it, acts, and
 * comes back — it is not a live pane, and a page that re-asked every ten
 * seconds would cost the gateway three bounded queries for nothing.
 */
export const useOrgMcpOverview = (
  orgUid?: string,
  filters: McpOrganizationOverviewFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpOrganizationOverview>({
    queryKey: queryKeys.mcp.orgOverview(orgUid ?? '', filters),
    queryFn: () => getOrganizationMcpOverview(token ?? '', orgUid!, filters, mcpUrl),
    enabled: Boolean(token && mcpUrl && orgUid) && (options.enabled ?? true),
    staleTime: 60_000,
  });
};

// -- Connected agents (IAM) ------------------------------------------------

export const useConnectedAgents = (options: { enabled?: boolean } = {}) => {
  const token = useIAMStore(state => state.token);
  const iamUrl = useIamUrl();
  return useQuery<ConnectedAgent[]>({
    queryKey: queryKeys.mcp.connectedAgents(),
    queryFn: () => listConnectedAgents(token ?? '', iamUrl),
    enabled: Boolean(token && iamUrl) && (options.enabled ?? true),
    staleTime: 30_000,
  });
};

/** Revoke a grant; the list and the activity are refreshed, never guessed. */
export const useDisconnectAgent = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const iamUrl = useIamUrl();
  return useMutation<{ success: boolean; message?: string }, Error, string>({
    mutationFn: grantUid => disconnectAgent(token ?? '', grantUid, iamUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.connectedAgents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.activity() });
    },
  });
};

// -- Observability (OTEL) --------------------------------------------------

/** The spans of a run, from the task's trace id; asked again while the task runs. */
export const useRunTrace = (taskUid?: string, options: { enabled?: boolean } = {}) => {
  const token = useIAMStore(state => state.token);
  const otelUrl = useOtelUrl();
  const task = useTask(taskUid);
  return useQuery<McpRunTrace>({
    queryKey: queryKeys.mcp.trace(taskUid ?? ''),
    queryFn: () => fetchRunTrace(token ?? '', task.data!, otelUrl),
    enabled: Boolean(token && otelUrl && task.data) && (options.enabled ?? true),
    staleTime: 15_000,
    refetchInterval: task.data && !isMcpTaskTerminal(task.data.status) ? 5_000 : false,
  });
};

/**
 * The spans of one trace, for a call that finished inside its own request.
 *
 * Read once and kept: a finished trace does not change, and the pane that
 * shows it is opened from an audit row rather than watched.
 */
export const useMcpTrace = (traceId?: string, options: { enabled?: boolean } = {}) => {
  const token = useIAMStore(state => state.token);
  const otelUrl = useOtelUrl();
  return useQuery<McpRunTrace>({
    queryKey: queryKeys.mcp.traceById(traceId ?? ''),
    queryFn: () => fetchTraceSpans(token ?? '', traceId!, otelUrl),
    enabled: Boolean(token && otelUrl && traceId) && (options.enabled ?? true),
    staleTime: 60_000,
  });
};

/** The four SLIs and the catalog, platform-wide or for one agent or organization. */
export const useMcpMetrics = (
  filters: McpMetricsFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const otelUrl = useOtelUrl();
  return useQuery<McpMetricsSnapshot>({
    queryKey: queryKeys.mcp.metrics(filters),
    queryFn: () => fetchMcpMetrics(token ?? '', filters, otelUrl),
    enabled: Boolean(token && otelUrl) && (options.enabled ?? true),
    staleTime: 30_000,
  });
};

/** The log lines of a run, gateway and worker alike, by its trace. */
export const useMcpLogs = (
  taskUid?: string,
  options: { enabled?: boolean; limit?: number; severity?: string } = {},
) => {
  const token = useIAMStore(state => state.token);
  const otelUrl = useOtelUrl();
  const task = useTask(taskUid);
  return useQuery<McpRunLogs>({
    queryKey: queryKeys.mcp.logs(taskUid ?? ''),
    queryFn: () =>
      fetchMcpLogs(token ?? '', task.data!, { limit: options.limit, severity: options.severity }, otelUrl),
    enabled: Boolean(token && otelUrl && task.data) && (options.enabled ?? true),
    staleTime: 15_000,
    refetchInterval: task.data && !isMcpTaskTerminal(task.data.status) ? 5_000 : false,
  });
};

// -- Operations (platform administrators) ----------------------------------

export const useMcpWorkers = (options: { enabled?: boolean } = {}) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpWorkerList>({
    queryKey: queryKeys.mcp.workers(),
    queryFn: () => listWorkers(token ?? '', mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
};

export const useMcpWorkflowsHealth = (options: { enabled?: boolean } = {}) => {
  const token = useIAMStore(state => state.token);
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpWorkflowsHealth>({
    queryKey: queryKeys.mcp.workflows(),
    queryFn: () => getWorkflowsHealth(token ?? '', mcpUrl),
    enabled: Boolean(token && mcpUrl) && (options.enabled ?? true),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
};

/** The gateway's version and resource; no token needed. */
export const useMcpGatewayVersion = () => {
  const mcpUrl = useMcpServerUrl();
  return useQuery<McpGatewayVersion>({
    queryKey: queryKeys.mcp.gatewayVersion(),
    queryFn: () => getGatewayVersion(mcpUrl),
    enabled: Boolean(mcpUrl),
    staleTime: 300_000,
  });
};
