/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A task of the Jupyter MCP Server: one tool call that outlives the request
 * that started it.
 *
 * The `uid` is the MCP `taskId`. A task is submitted by an agent, runs in
 * the sandbox its session is bound to, and is reachable by anyone allowed to
 * see the notebook it touched — from another device, forty minutes later.
 * The gateway keeps the portable projection in `mcp-tasks`; the workflow
 * engine owns claims and recovery, which is why there are no lease fields.
 *
 * Snake case on the wire, camel case here, exactly as Contents does.
 *
 * @module models/McpTask
 */

/** Where a task has got to; the MCP task status vocabulary. */
export type McpTaskStatus =
  | 'working'
  | 'input_required'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** The engine a task's workflow runs on. */
export type McpWorkflowEngine = 'temporal' | 'dbos';

/** A tool result small enough to travel with the task. */
export interface McpCallToolResult {
  content?: Array<Record<string, unknown>>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  [key: string]: unknown;
}

/** One output of a task, in order; large outputs are references. */
export interface McpTaskOutput {
  index: number;
  outputType: string;
  mimeType?: string | null;
  /** Inline text under the size limit. */
  text?: string | null;
  /** An object reference for anything larger. */
  reference?: string | null;
}

export interface McpTask {
  uid: string;
  status: McpTaskStatus;
  statusMessage?: string | null;
  tool: string;
  notebookUid?: string | null;
  cellId?: string | null;
  sandboxUid?: string | null;
  /** A Contents operation, when the task wraps one. */
  operationUid?: string | null;
  /** An attachment, when the task follows its lifecycle without an operation. */
  attachmentUid?: string | null;
  /** A Contents `mcp_approval` or an ai-agents tool approval. */
  approvalUid?: string | null;
  /** The session the task executes in; never empty for an execution task. */
  sandboxBindingUid?: string | null;
  initiatingUser: string;
  initiatingClient?: string | null;
  orgUid?: string | null;
  createdAt: string;
  lastUpdatedAt: string;
  ttlMs?: number | null;
  pollIntervalMs?: number | null;
  /** The `CallToolResult` for small results; a resource URI otherwise. */
  result?: McpCallToolResult | string | null;
  error?: string | null;
  traceId?: string | null;
  workflowEngine?: McpWorkflowEngine | null;
  /** Always the task uid, so a retried start cannot create a second execution. */
  workflowId?: string | null;
  /** The Temporal run id; empty for DBOS. */
  workflowRunId?: string | null;
  queue?: string | null;
  sandboxProvider?: string | null;
  workerReplica?: string | null;
  outputs?: McpTaskOutput[];
}

export interface McpTaskList {
  items: McpTask[];
  nextCursor?: string | null;
}

/** What `POST /tasks/{uid}/input` carries: the REST face of `tasks/update`. */
export interface McpTaskInput {
  input: Record<string, unknown>;
}

/** A `notifications/tasks` payload, as the SSE stream and the socket carry it. */
export interface McpTaskEvent {
  /** `status`, `output`, `input_required`, `completed`, `failed`, `cancelled`. */
  event: string;
  taskId: string;
  status?: McpTaskStatus;
  statusMessage?: string | null;
  output?: McpTaskOutput;
  task?: McpTask;
  at?: string;
}

/** The statuses from which nothing more happens. */
export const MCP_TERMINAL_TASK_STATUSES: ReadonlySet<McpTaskStatus> =
  new Set<McpTaskStatus>(['completed', 'failed', 'cancelled']);

export const isMcpTaskTerminal = (status: McpTaskStatus): boolean =>
  MCP_TERMINAL_TASK_STATUSES.has(status);
