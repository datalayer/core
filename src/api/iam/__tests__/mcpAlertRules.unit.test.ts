/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The alert rules an organization asked to be told about.
 *
 * The property this file protects: a rule the evaluator cannot evaluate is
 * refused *while somebody is still looking at the form*. A rule that never
 * fires because of a typo is indistinguishable from a condition that never
 * happened, and the second is what somebody will believe.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  ALERT_CONDITIONS,
  ALERT_OPERATORS,
  ALERT_SEVERITIES,
  AlertRuleInvalid,
  createAlertRule,
  deleteAlertRule,
  listAlertRules,
  updateAlertRule,
} from '../mcpAlertRules';

const IAM = 'https://iam.test';
const ORG = '01ORG';

const DRAFT = {
  condition: 'tasks.open',
  operator: 'gt',
  threshold: 20,
  severity: 'warning' as const,
  windowSeconds: 3600,
  scopeKind: 'organization' as const,
  scopeUid: '',
  enabled: true,
};

const httpError = (status: number, message = 'refused'): Error => {
  const error = new Error(message) as Error & { response: { status: number } };
  error.response = { status };
  return error;
};

describe('alert rules', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads an organization’s rules, disabled ones included', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      rules: [
        {
          uid: '01R',
          condition: 'tasks.open',
          threshold: 20,
          operator: 'gt',
          severity: 'warning',
          window_seconds: 3600,
          scope_kind: 'organization',
          enabled: false,
          version: 3,
        },
      ],
    } as never);

    const [rule] = await listAlertRules('token', ORG, IAM);

    expect(rule.condition).toBe('tasks.open');
    expect(rule.windowSeconds).toBe(3600);
    // Disabled is a state to render, not a reason to hide: a rule somebody
    // switched off is one they may want back.
    expect(rule.enabled).toBe(false);
  });

  it('sends the wire names the service stores', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, rule: { uid: '01R' } } as never);

    await createAlertRule('token', ORG, DRAFT, IAM);

    expect(request.mock.calls[0][0].body).toEqual({
      condition: 'tasks.open',
      operator: 'gt',
      threshold: 20,
      severity: 'warning',
      window_seconds: 3600,
      scope_kind: 'organization',
      scope_uid: '',
      enabled: true,
    });
  });

  it('keeps a rule that was switched off switched off', async () => {
    // `enabled: false` is falsy, and an update that dropped it would quietly
    // switch every disabled rule back on.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, rule: { uid: '01R' } } as never);

    await updateAlertRule('token', ORG, '01R', { ...DRAFT, enabled: false }, IAM);

    expect((request.mock.calls[0][0].body as Record<string, unknown>).enabled).toBe(
      false,
    );
  });

  it('keeps a threshold of zero', async () => {
    // Also falsy, and a real threshold: "audit write failures above 0".
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, rule: { uid: '01R' } } as never);

    await createAlertRule('token', ORG, { ...DRAFT, threshold: 0 }, IAM);

    expect((request.mock.calls[0][0].body as Record<string, unknown>).threshold).toBe(
      0,
    );
  });

  it('surfaces the evaluator’s own refusal, with its words', async () => {
    // A 422 here is never a bug in the client: it is the evaluator saying
    // what is wrong, and losing it behind a generic failure leaves somebody
    // guessing at the one thing the platform already knows.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(422, "unknown condition 'tasks.opne'"),
    );

    await expect(createAlertRule('token', ORG, DRAFT, IAM)).rejects.toBeInstanceOf(
      AlertRuleInvalid,
    );
    await expect(createAlertRule('token', ORG, DRAFT, IAM)).rejects.toThrow(
      'tasks.opne',
    );
  });

  it('does not dress a different failure as a bad rule', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(httpError(403));

    await expect(
      createAlertRule('token', ORG, DRAFT, IAM),
    ).rejects.not.toBeInstanceOf(AlertRuleInvalid);
  });

  it('addresses one rule under its organization', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({} as never);

    await deleteAlertRule('token', ORG, '01R', IAM);

    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/mcp-alert-rules/${ORG}/01R`,
    );
    expect(request.mock.calls[0][0].method).toBe('DELETE');
  });

  it('marks a condition nothing measures as not measurable', () => {
    // Offered as though it worked, a rule on it would be stored, never fire,
    // and look exactly like a condition that never happens — the silence
    // rules exist to break.
    const latency = ALERT_CONDITIONS.find(c => c.name === 'sli.latency');
    expect(latency?.measurable).toBe(false);
  });

  it('offers every operator the evaluator implements', () => {
    expect(ALERT_OPERATORS.map(o => o.name).sort()).toEqual(
      ['eq', 'gt', 'gte', 'lt', 'lte'],
    );
  });

  it('offers the three severities and no others', () => {
    expect([...ALERT_SEVERITIES]).toEqual(['info', 'warning', 'critical']);
  });

  it('explains each condition rather than naming it', () => {
    // The names are the gateway's counters. "spend.budget_fraction" is not
    // a sentence anybody writing a rule should have to decode.
    for (const condition of ALERT_CONDITIONS) {
      expect(condition.label).toBeTruthy();
      expect(condition.help.length).toBeGreaterThan(20);
    }
  });
});
