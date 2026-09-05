/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A binding of the Jupyter MCP Server: a handle an agent holds on a
 * notebook (`nb_…`), a toolset (`ts_…`) or a sandbox (`sb_…`).
 *
 * The sandbox binding *is* the session: one per (user, client) unless a
 * client holds several on purpose. A notebook binding names the sandbox its
 * cells execute on. Bindings live in `mcp-gateway`, expire with the item or
 * the reservation they follow, and are refreshed on use.
 *
 * @module models/McpBinding
 */

export type McpBindingKind = 'notebook' | 'toolset' | 'sandbox';

/** What the gateway does when the sandbox behind a binding is gone. */
export type McpBindingOnLost = 'fail' | 'relaunch';

/** Where a sandbox binding is; `lost` is what `SANDBOX_LOST` reports. */
export type McpBindingState = 'active' | 'lost' | 'closed' | 'expired';

export interface McpBinding {
  /** The handle: `nb_…`, `ts_…` or `sb_…`. */
  uid: string;
  kind: McpBindingKind;
  userUid: string;
  clientId?: string | null;
  agentUid?: string | null;
  orgUid?: string | null;
  alias?: string | null;
  /** The Spacer notebook, for a `notebook` binding. */
  itemUid?: string | null;
  /** The Contents source and session, for a `toolset` binding. */
  sourceUid?: string | null;
  sessionUid?: string | null;
  /** The runtime, for a `sandbox` binding. */
  sandboxUid?: string | null;
  sandboxProvider?: string | null;
  /** What the runtime reported it can do. */
  capabilities?: string[];
  onLost?: McpBindingOnLost;
  /** The gateway replica whose worker holds the connection. */
  workerReplica?: string | null;
  /** The owner's uid when the sandbox is shared with the caller through its ACL. */
  sharedFrom?: string | null;
  /** For a notebook binding: the sandbox its cells execute on. */
  sandboxBindingUid?: string | null;
  state?: McpBindingState;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
}

export interface McpBindingList {
  items: McpBinding[];
  nextCursor?: string | null;
}
