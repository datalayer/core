/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What one agent may execute and reach, as the Jupyter MCP Server decides it.
 *
 * Every answer here comes from the steps a call goes through — the token's
 * scopes, the policy layers, then Spacer or Contents for the object — so a
 * tool or a notebook listed as refused is one the agent would be refused.
 *
 * @module models/McpAgentAccess
 */

/** The agent an answer is about. `grant` is null for the token that asked. */
export interface McpAgentNamed {
  grant: string | null;
  clientId: string | null;
  clientName: string | null;
  scopes: string[];
  orgUid: string | null;
  teamUid: string | null;
}

export type McpToolsetHealthState = 'ready' | 'degraded' | 'unknown';

export interface McpToolsetHealth {
  /** `unknown` is a toolset nothing here measures, never one reported well. */
  state: McpToolsetHealthState;
  detail: string;
}

/**
 * How a client comes to hold a toolset: the plain endpoint serves `base`, a
 * URL names an `optional` one, a `source` is enabled in a session, and an
 * `application` one is reached through an application's connection.
 */
export type McpToolsetSelected = 'base' | 'optional' | 'source' | 'application';

/** One tool, decided for this agent. */
export interface McpAgentTool {
  name: string;
  /** The scopes it requires, space-separated. */
  scope: string;
  allowed: boolean;
  /** Why not: `scope`, a policy rule, `connection` or `item`. */
  rule: string | null;
  /** Which layer decided. */
  decidedBy: string | null;
  detail: string | null;
  /** The layer that makes a person approve a call first, when one does. */
  approval: string | null;
}

/** A source's own rule for its calls, as Contents keeps it. */
export type McpSourceApprovalPolicy = 'explicit' | 'auto-allowlisted' | 'never';

export interface McpAgentToolset {
  kind: 'toolset' | 'source';
  /** The source, when it is one. */
  uid?: string;
  name: string;
  title: string;
  description: string | null;
  selected: McpToolsetSelected;
  health: McpToolsetHealth;
  /** A source's; a toolset's tools each say their own `approval`. */
  approvalPolicy: McpSourceApprovalPolicy | null;
  tools: McpAgentTool[];
}

export interface McpAgentToolsets {
  agent: McpAgentNamed;
  toolsets: McpAgentToolset[];
  /** Why the sources are missing, when Contents could not be read. */
  sourcesError: string | null;
}

/** One notebook or source, and how far this agent reaches it. */
export interface McpReachRow {
  kind: 'notebook' | 'source';
  uid: string;
  name: string;
  /** A notebook's Space, a source's kind. */
  where: string | null;
  read: boolean;
  write: boolean;
  execute: boolean;
  /** Why it stops short of `execute`, in sentences. */
  refused: string[];
  /** Whether a source is the caller's own. */
  yours?: boolean;
  /** Set when the check could not run: an answer about the check, not the agent. */
  unchecked: string | null;
}

export interface McpAgentReach {
  agent: McpAgentNamed;
  notebooks: McpReachRow[];
  sources: McpReachRow[];
  /** How many there are of each, of which `limit` were asked about. */
  notebooksListed: number;
  sourcesListed: number;
  limit: number;
  /** Contents has more than were read. */
  sourcesTruncated: boolean;
  notebooksError: string | null;
  sourcesError: string | null;
}
