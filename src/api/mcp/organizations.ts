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
