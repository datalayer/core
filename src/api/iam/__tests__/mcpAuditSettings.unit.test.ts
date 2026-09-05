/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Retention, forwarding, and where alerts go.
 *
 * The behaviour worth most of this file: a **partial** write. IAM merges, so
 * a page editing only the alert destinations must not send an empty
 * retention and clear it — an organization's audit would start being swept
 * on a schedule nobody chose.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  AuditSettingInvalid,
  getAuditSettings,
  setAuditSettings,
} from '../mcpAuditSettings';

const IAM = 'https://iam.test';
const ORG = '01ORG';

const httpError = (status: number, message = 'refused'): Error => {
  const error = new Error(message) as Error & { response: { status: number } };
  error.response = { status };
  return error;
};

const body = (request: ReturnType<typeof vi.spyOn>) =>
  request.mock.calls[0][0].body as Record<string, unknown>;

describe('audit settings', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads what the organization has decided', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      settings: {
        retention_days: 90,
        alert_emails: 'ops@example.co',
        alert_slack_webhook_url: 'https://hooks.slack.com/services/T/B/x',
        version: 4,
      },
    } as never);

    const settings = await getAuditSettings('token', ORG, IAM);

    expect(settings?.retentionDays).toBe(90);
    expect(settings?.alertEmails).toBe('ops@example.co');
    expect(settings?.alertSlackWebhookUrl).toContain('hooks.slack.com');
    expect(settings?.version).toBe(4);
  });

  it('answers null for an organization that has decided nothing', async () => {
    // Neither swept nor forwarded is the default, not a failure.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(httpError(404));

    expect(await getAuditSettings('token', ORG, IAM)).toBeNull();
  });

  it('does not read a refusal as an absence', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(httpError(403));

    await expect(getAuditSettings('token', ORG, IAM)).rejects.toThrow();
  });

  it('sends only what it was given', async () => {
    // The whole point. IAM merges, so an untouched retention must not be
    // sent as empty — the organization would start being swept on a
    // schedule nobody chose.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, settings: {} } as never);

    await setAuditSettings('token', ORG, { alertEmails: 'ops@example.co' }, {}, IAM);

    expect(body(request)).toEqual({ alert_emails: 'ops@example.co' });
  });

  it('sends a cleared field rather than dropping it', async () => {
    // Clearing is a decision. An empty string that never leaves the client
    // is a destination somebody removed and that keeps receiving.
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, settings: {} } as never);

    await setAuditSettings('token', ORG, { alertWebhookUrl: '' }, {}, IAM);

    expect(body(request)).toEqual({ alert_webhook_url: '' });
  });

  it('sends a retention of zero rather than dropping it', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, settings: {} } as never);

    await setAuditSettings('token', ORG, { retentionDays: 0 }, {}, IAM);

    expect(body(request)).toEqual({ retention_days: 0 });
  });

  it('uses the wire names IAM validates', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, settings: {} } as never);

    await setAuditSettings(
      'token',
      ORG,
      {
        alertSlackWebhookUrl: 'https://hooks.slack.com/services/T/B/x',
        destinationKind: 'https',
        destinationUrl: 'https://siem.example/in',
      },
      {},
      IAM,
    );

    expect(Object.keys(body(request)).sort()).toEqual([
      'alert_slack_webhook_url',
      'destination_kind',
      'destination_url',
    ]);
  });

  it('surfaces IAM’s refusal with its own words', async () => {
    // "that is not a Slack webhook" is the whole answer; a generic failure
    // would leave somebody guessing at the one thing IAM already knows.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(422, 'is not a Slack incoming webhook'),
    );

    await expect(
      setAuditSettings('token', ORG, { alertSlackWebhookUrl: 'https://x' }, {}, IAM),
    ).rejects.toBeInstanceOf(AuditSettingInvalid);
    await expect(
      setAuditSettings('token', ORG, { alertSlackWebhookUrl: 'https://x' }, {}, IAM),
    ).rejects.toThrow('Slack');
  });

  it('does not dress a refused permission as a bad setting', async () => {
    // Different messages, and confusing them sends somebody to fix a field
    // that is fine while the real answer is that they may not write here.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(httpError(403));

    await expect(
      setAuditSettings('token', ORG, { alertEmails: 'ops@example.co' }, {}, IAM),
    ).rejects.not.toBeInstanceOf(AuditSettingInvalid);
  });

  it('carries the version it read', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, settings: {} } as never);

    await setAuditSettings('token', ORG, {}, { expectedVersion: 4 }, IAM);

    expect(request.mock.calls[0][0].url).toContain('expected_version=4');
  });
});
