/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What every MCP view is given by the application that draws it.
 *
 * Two things a Core view does not decide for itself: the words for a
 * failure, and the addresses to link to. Both belong to the application —
 * the web application says "Sign in to see your agents" and routes at
 * `/audit`, JupyterLab says something else and routes somewhere else — so
 * they arrive as props rather than as a second copy of the same catalog
 * inside Core.
 *
 * The classification itself lives once, in the application, beside its
 * specification: `ui/src/views/mcp/mcpErrorState.ts` and its spec.
 *
 * @module views/mcp/types
 */

/** What a failed request actually was, in the reader's terms. */
export type McpErrorReason =
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'unavailable'
  | 'unknown';

export interface McpErrorState {
  reason: McpErrorReason;
  heading: string;
  description: string;
  /** Whether retrying in place could plausibly succeed. */
  retryable: boolean;
}

/**
 * Describe a failure in terms of what the reader was looking at; `subject`
 * names it as it appears on screen ("Connected agents", "Audit").
 */
export type McpErrorStateFn = (error: unknown, subject: string) => McpErrorState;

/**
 * Where the MCP surfaces live in the application drawing them.
 *
 * A view links onward — a call to its audit row, an agent to its runs — and
 * must not invent the addresses; the application owns its routing.
 */
export interface McpRoutes {
  /** The dashboard: what the connected clients are doing right now. */
  dashboard: string;
  /** Setup and access: the endpoint and the per-client cards. */
  access: string;
  /** The audit log. */
  audit: string;
  /** The runs list; a task appends `/{uid}`. */
  runs: string;
  /** The observability panes. */
  observability: string;
  /** The connected agents. */
  agents: string;
  /** The effective policy. */
  policies: string;
}

/** The application's routes, as the web application places them today. */
export const DEFAULT_MCP_ROUTES: McpRoutes = {
  dashboard: '/mcp',
  access: '/access/mcp',
  audit: '/audit',
  runs: '/runs',
  observability: '/access/mcp/observability',
  agents: '/settings/agents',
  policies: '/settings/policies',
};
