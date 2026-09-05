/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The caller's handles: notebooks, toolsets and the sandbox bindings that
 * are their sessions.
 *
 * `DELETE /bindings/{uid}` on a sandbox binding terminates the runtime
 * through Runtimes and ends the tasks running on it `SANDBOX_LOST`.
 *
 * @module api/mcp/bindings
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpUrl } from './gateway';
import type {
  McpBinding,
  McpBindingKind,
  McpBindingList,
  McpBindingState,
} from '../../models/McpBinding';

export type {
  McpBinding,
  McpBindingKind,
  McpBindingList,
  McpBindingOnLost,
  McpBindingState,
} from '../../models/McpBinding';

export interface McpBindingListFilters {
  kind?: McpBindingKind;
  state?: McpBindingState;
  /** The `client_id` of the agent holding the handle. */
  agent?: string;
  org?: string;
  cursor?: string;
  limit?: number;
}

/** Every handle the caller holds, optionally of one kind. */
export const listBindings = async (
  token: string,
  filters: McpBindingListFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpBindingList> =>
  fromWire<McpBindingList>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/bindings', {
        kind: filters.kind,
        state: filters.state,
        agent: filters.agent,
        org: filters.org,
        cursor: filters.cursor,
        limit: filters.limit,
      }),
      method: 'GET',
      token,
    }),
  );

/**
 * Release a handle. For a sandbox binding this terminates the runtime; a
 * notebook or toolset binding is simply forgotten.
 */
export const terminateBinding = async (
  token: string,
  bindingUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpBinding> =>
  fromWire<McpBinding>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, `/bindings/${encodeURIComponent(bindingUid)}`),
      method: 'DELETE',
      token,
    }),
  );
