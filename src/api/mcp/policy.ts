/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The effective policy for the caller's token, redacted, each rule naming
 * the layer that decided it. `?agent=` previews the policy as one agent
 * would see it.
 *
 * @module api/mcp/policy
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpUrl } from './gateway';
import type { McpEffectivePolicy } from '../../models/McpPolicy';

export type {
  McpApprovalPolicy,
  McpEffectivePolicy,
  McpOrganizationPolicy,
  McpPersonalPolicy,
  McpPolicyLayer,
  McpPolicyRule,
  McpPolicyScope,
  McpToolRule,
} from '../../models/McpPolicy';

export interface McpPolicyFilters {
  /** Preview as: the `client_id` of an agent. */
  agent?: string;
  org?: string;
  team?: string;
}

export const getEffectivePolicy = async (
  token: string,
  filters: McpPolicyFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpEffectivePolicy> =>
  fromWire<McpEffectivePolicy>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/policy', { ...filters }),
      method: 'GET',
      token,
    }),
  );
