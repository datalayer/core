/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an administrator sees first: the organization's MCP overview.
 *
 * One answer for the Enterprise console's Overview page — the agents that
 * acted today, the runs and their success rate, the refusals by reason, the
 * approvals waiting and the compliance strip over what IAM knows. Spend,
 * quota and alerts join the same answer in milestone 3; a field the gateway
 * does not fill yet is absent rather than zero, so the page can say "not
 * measured yet" instead of "none".
 *
 * `?team=` narrows every part of it to one team.
 *
 * @module api/mcp/organizations
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpUrl } from './gateway';

/** One line of the compliance strip: green, or naming what is missing. */
export interface McpComplianceCheck {
  /** The rule's name, e.g. `sso_required`, `admitted_clients_only`. */
  name: string;
  ok: boolean;
  /** What is missing, when it is not `ok`. */
  detail?: string | null;
}

/** How many principals act through MCP for the organization. */
export interface McpOverviewAgents {
  delegated: number;
  service: number;
  activeToday: number;
}

export interface McpOverviewRuns {
  today: number;
  succeeded: number;
  failed: number;
  /** `completed` over terminal tasks; `null` when nothing ran. */
  successRate?: number | null;
}

/** Milestone 3 fills the quota; until then only what was spent is known. */
export interface McpOverviewSpend {
  creditsToday: number;
  creditsMonth: number;
  quotaMonth?: number | null;
}

export interface McpRefusalCount {
  reason: string;
  count: number;
}

export interface McpOrganizationOverview {
  orgUid: string;
  teamUid?: string | null;
  /** The moment the answer was assembled. */
  at: string;
  agents: McpOverviewAgents;
  runs: McpOverviewRuns;
  spend?: McpOverviewSpend | null;
  refusals: McpRefusalCount[];
  approvalsWaiting?: number | null;
  alertsFiring?: number | null;
  compliance: McpComplianceCheck[];
}

export interface McpOrganizationOverviewFilters {
  /** One team of the organization, rather than all of them. */
  team?: string;
}

export const getOrganizationMcpOverview = async (
  token: string,
  orgUid: string,
  filters: McpOrganizationOverviewFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpOrganizationOverview> =>
  fromWire<McpOrganizationOverview>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, `/organizations/${encodeURIComponent(orgUid)}/overview`, {
        team: filters.team,
      }),
      method: 'GET',
      token,
    }),
  );

/** One quota: what may be used, what is, and the share of the two.
 *
 * `used` is `null` where the figure could not be read, with `unknown` saying
 * why. Absent and unreadable look identical in a dashboard — no number
 * beside a heading — and mean opposite things: one is "no limit set", the
 * other is "we cannot tell you what your limit is".
 */
export interface McpQuota {
  limit?: number | null;
  used?: number | null;
  /** `used / limit`, computed by the gateway so a page and an alert cannot
   * divide differently. */
  fraction?: number | null;
  /** Why the figure could not be read. Present only when it could not. */
  unknown?: string;
}

/** What one agent spent of the day's credits. */
export interface McpAgentSpend {
  /** The MCP client it connected as, e.g. `claude`. Empty for a service
   * agent reaching Runtimes through the gateway. */
  clientId: string;
  /** The service agent's uid, where it is one. */
  agentUid: string;
  credits: number;
  /** Usage records behind the figure. */
  records: number;
}

export interface McpOrganizationUsage {
  orgUid: string;
  teamUid?: string | null;
  window: { seconds: number };
  quotas: {
    creditsPerDay?: McpQuota;
    concurrentSandboxes?: McpQuota;
    callsPerMinute?: McpQuota;
  };
  /** Which agents the day's credits went to, biggest spender first. Empty
   * where the total could not be read — the parts under an unreadable whole
   * make every agent look cheap. */
  byAgent: McpAgentSpend[];
  /** Where a limit is changed, which is not here. */
  setAt: string;
}

/**
 * One organization's use against its quotas, and who spent it.
 *
 * Never throws for a figure it could not read: this is a page somebody opens
 * when something is wrong, and the half of it that works is worth more than
 * an error saying one number was unavailable.
 */
export const getOrganizationMcpUsage = async (
  token: string,
  orgUid: string,
  filters: McpOrganizationOverviewFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpOrganizationUsage> =>
  fromWire<McpOrganizationUsage>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, `/organizations/${encodeURIComponent(orgUid)}/usage`, {
        team: filters.team,
      }),
      method: 'GET',
      token,
    }),
  );
