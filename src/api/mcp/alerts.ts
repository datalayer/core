/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Trying a rule before trusting it.
 *
 * The gateway answers what a rule would see *right now*, recording nothing
 * and telling nobody. The question worth asking is not what the number is
 * but whether the condition can be **read at all**: a rule on something
 * nothing reads never fires, and never firing is exactly what a
 * correctly-quiet rule looks like — so writing one and waiting teaches
 * nothing, for as long as somebody is willing to wait.
 *
 * @module api/mcp/alerts
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { mcpUrl } from './gateway';

export interface McpAlertRuleTrial {
  /** Whether anything could answer the condition at all. */
  readable: boolean;
  /** The reading, when there was one. */
  value?: number;
  /** Whether the rule would fire on it. */
  wouldFire: boolean;
  /** Why it could not be read, or what the reader had to add. */
  detail: string;
}

/**
 * What this rule would see now.
 *
 * The organization is the caller's own, whatever is sent — testing another
 * organization's numbers is reading their numbers, and the gateway refuses
 * to do it rather than trusting the body.
 */
export const testAlertRule = async (
  token: string,
  rule: {
    condition: string;
    operator: string;
    threshold: number;
    windowSeconds: number;
    scopeKind?: string;
    scopeUid?: string;
  },
  mcpServerUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpAlertRuleTrial> => {
  const response = await requestDatalayerAPI<{
    readable?: boolean;
    value?: number;
    would_fire?: boolean;
    detail?: string;
  }>({
    url: mcpUrl(mcpServerUrl, '/alerts/test'),
    method: 'POST',
    token,
    body: {
      condition: rule.condition,
      operator: rule.operator,
      threshold: rule.threshold,
      window_seconds: rule.windowSeconds,
      scope_kind: rule.scopeKind ?? 'organization',
      scope_uid: rule.scopeUid ?? '',
    },
  });
  return {
    readable: Boolean(response.readable),
    value: response.value,
    wouldFire: Boolean(response.would_fire),
    detail: response.detail ?? '',
  };
};
