/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An audit row of the Jupyter MCP Server: one call or one decision, written
 * by the gateway for every request, append-only in `mcp-audit`.
 *
 * Audit answers *who did what, and was it allowed*. It is not telemetry: a
 * row carries the trace id so one trace joins both trails, and never an
 * argument in clear — arguments are hashed and redacted with the Contents
 * rules before they reach the row.
 *
 * @module models/McpAuditEvent
 */

export type McpAuditDecision = 'allowed' | 'refused';

export type McpAuditOutcome = 'ok' | 'error' | 'is_error';

export interface McpClientInfo {
  name?: string;
  version?: string;
  [key: string]: unknown;
}

export interface McpAuditEvent {
  uid: string;
  at: string;
  orgUid?: string | null;
  teamUid?: string | null;
  userUid: string;
  clientId?: string | null;
  agentUid?: string | null;
  /** The delegation chain (RFC 8693 `act`), outermost first. */
  act?: string[];
  /** The JSON-RPC method, or the REST route for a gateway API call. */
  method: string;
  tool?: string | null;
  itemUid?: string | null;
  sourceUid?: string | null;
  cellId?: string | null;
  argumentsHash?: string | null;
  redactedArguments?: Record<string, unknown> | null;
  decision: McpAuditDecision;
  /** Names the rule and, once policy has layers, the layer that decided. */
  refusalReason?: string | null;
  outcome?: McpAuditOutcome | null;
  durationMs?: number | null;
  taskId?: string | null;
  traceId?: string | null;
  replica?: string | null;
  protocolVersion?: string | null;
  clientInfo?: McpClientInfo | null;
}

export interface McpAuditEventList {
  items: McpAuditEvent[];
  nextCursor?: string | null;
}

export type McpAuditExportFormat = 'jsonl' | 'csv';
