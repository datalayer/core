/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The alert rules an organization asked to be told about.
 *
 * A rule is a condition over a number the gateway already counts, checked
 * once a minute, firing at most once per condition per window. IAM stores
 * them; the gateway's evaluator reads the enabled ones on its tick.
 *
 * **A rule the evaluator cannot evaluate is refused when it is written**,
 * not at the tick. That is the whole reason the vocabulary below is
 * exported: a rule that never fires because of a typo is indistinguishable
 * from a condition that never happened, and the second is what somebody will
 * believe. A form built from these lists cannot produce one.
 *
 * @module api/iam/mcpAlertRules
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/**
 * What a rule may be about.
 *
 * Each name is answered by one reader in the gateway. `measurable` says
 * whether a reader exists *today*: a condition with none is counted
 * unreadable and never fires, which is exactly the silence rules are written
 * to avoid — so a form shows it as not yet available rather than offering it
 * as though it worked.
 */
export const ALERT_CONDITIONS: {
  name: string;
  label: string;
  help: string;
  measurable: boolean;
}[] = [
  {
    name: 'tasks.open',
    label: 'Open tasks',
    help: 'Runs still going. A backlog that is not draining.',
    measurable: true,
  },
  {
    name: 'tasks.failed',
    label: 'Failed tasks',
    help: 'Runs that ended badly in the window.',
    measurable: true,
  },
  {
    name: 'spend.budget_fraction',
    label: 'Share of the daily budget spent',
    help:
      'A fraction: 0.8 is 80%. Prefer this to a credit figure — it follows ' +
      'the budget, so raising the budget does not silently move the alert.',
    measurable: true,
  },
  {
    name: 'spend.credits',
    label: 'Credits spent',
    help:
      'An absolute figure. Raising the budget leaves this rule where it ' +
      'was, and you will be told at a share you did not choose.',
    measurable: true,
  },
  {
    name: 'audit.write_failures',
    label: 'Audit writes that failed',
    help: 'A gap in the record. Worth knowing about immediately.',
    measurable: true,
  },
  {
    name: 'sli.availability',
    label: 'Availability',
    help:
      'The share of calls that did not fail, as a fraction. An organization ' +
      'with no calls has no availability, and is not alerted on.',
    measurable: true,
  },
  {
    name: 'sli.latency',
    label: 'Latency (p95)',
    help:
      'Not measurable yet: a percentile needs the observability service, ' +
      'and the gateway counts rather than times. A rule on it would never ' +
      'fire.',
    measurable: false,
  },
];

/** How a reading is compared with the threshold. */
export const ALERT_OPERATORS: { name: string; label: string }[] = [
  { name: 'gt', label: 'is above' },
  { name: 'gte', label: 'is at or above' },
  { name: 'lt', label: 'is below' },
  { name: 'lte', label: 'is at or below' },
  { name: 'eq', label: 'equals' },
];

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;

/** What a rule is measured over. */
export const ALERT_SCOPE_KINDS = ['organization', 'team', 'user', 'agent'] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export type AlertScopeKind = (typeof ALERT_SCOPE_KINDS)[number];

export interface McpAlertRule {
  uid: string;
  orgUid: string;
  condition: string;
  operator: string;
  threshold: number;
  severity: AlertSeverity;
  /** How far back a reading looks. Whole seconds — the tick is a minute. */
  windowSeconds: number;
  scopeKind: AlertScopeKind;
  /** The team, user or agent the rule is about; empty for the organization. */
  scopeUid: string;
  enabled: boolean;
  version?: number;
}

/** A rule as it is written. `uid` and `orgUid` come from the route. */
export type McpAlertRuleDraft = Omit<McpAlertRule, 'uid' | 'orgUid' | 'version'>;

interface WireRule {
  uid: string;
  org_uid?: string | null;
  condition?: string | null;
  operator?: string | null;
  threshold?: number | null;
  severity?: string | null;
  window_seconds?: number | null;
  scope_kind?: string | null;
  scope_uid?: string | null;
  enabled?: boolean | null;
  version?: number | null;
}

const fromWire = (rule: WireRule): McpAlertRule => ({
  uid: rule.uid,
  orgUid: rule.org_uid ?? '',
  condition: rule.condition ?? '',
  operator: rule.operator ?? 'gt',
  threshold: rule.threshold ?? 0,
  severity: (rule.severity as AlertSeverity) ?? 'warning',
  windowSeconds: rule.window_seconds ?? 3600,
  scopeKind: (rule.scope_kind as AlertScopeKind) ?? 'organization',
  scopeUid: rule.scope_uid ?? '',
  enabled: rule.enabled ?? true,
  version: rule.version ?? undefined,
});

const toWire = (rule: McpAlertRuleDraft): Record<string, unknown> => ({
  condition: rule.condition,
  operator: rule.operator,
  threshold: rule.threshold,
  severity: rule.severity,
  window_seconds: rule.windowSeconds,
  scope_kind: rule.scopeKind,
  scope_uid: rule.scopeUid,
  enabled: rule.enabled,
});

/** Raised when the evaluator could not evaluate the rule as written. */
export class AlertRuleInvalid extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertRuleInvalid';
  }
}

const rulesUrl = (baseUrl: string, orgUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/mcp-alert-rules/${encodeURIComponent(orgUid)}${suffix}`;

export const listAlertRules = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpAlertRule[]> => {
  const response = await requestDatalayerAPI<{ success: boolean; rules?: WireRule[] }>({
    url: rulesUrl(baseUrl, orgUid),
    method: 'GET',
    token,
  });
  return (response.rules ?? []).map(fromWire);
};

export const createAlertRule = async (
  token: string,
  orgUid: string,
  rule: McpAlertRuleDraft,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpAlertRule> => {
  const response = await withRefusal(() =>
    requestDatalayerAPI<{ success: boolean; rule?: WireRule }>({
      url: rulesUrl(baseUrl, orgUid),
      method: 'POST',
      token,
      body: toWire(rule),
    }),
  );
  return fromWire(response.rule ?? { uid: '' });
};

export const updateAlertRule = async (
  token: string,
  orgUid: string,
  uid: string,
  rule: McpAlertRuleDraft,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpAlertRule> => {
  const response = await withRefusal(() =>
    requestDatalayerAPI<{ success: boolean; rule?: WireRule }>({
      url: rulesUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}`),
      method: 'PUT',
      token,
      body: toWire(rule),
    }),
  );
  return fromWire(response.rule ?? { uid });
};

/** Remove one rule. What it watched is unwatched from the next tick. */
export const deleteAlertRule = async (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  await requestDatalayerAPI({
    url: rulesUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}`),
    method: 'DELETE',
    token,
  });
};

/**
 * Turn IAM's refusal into one the form can show beside the field.
 *
 * `422` here is never a bug in the client: it is the evaluator saying it
 * could not evaluate this rule, and its message names what is wrong. Losing
 * it behind a generic failure would leave somebody guessing at the one thing
 * the platform already knows.
 */
const withRefusal = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    const candidate = error as {
      status?: number;
      response?: { status?: number };
      message?: string;
    };
    const status = candidate?.status ?? candidate?.response?.status;
    if (status === 422) {
      throw new AlertRuleInvalid(
        candidate.message || 'The evaluator could not evaluate this rule.',
      );
    }
    throw error;
  }
};
