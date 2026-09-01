/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which agent spent the organization's credits, and when not to say.
 *
 * The console had a role called `organization_usage_reviewer` and no page of
 * usage. What it now shows turns on one distinction: a figure the gateway
 * *could not read* is not a figure that is *zero*. They are drawn the same
 * way by default — no number, no rows — and mean opposite things. A reader
 * who confuses them relaxes about a budget they are over.
 */

import { describe, expect, it } from 'vitest';
import {
  amount,
  breakdownState,
  quotaTone,
  spendRowsOf,
} from '../OrganizationUsage';
import type { McpOrganizationUsage } from '../../../api/mcp/organizations';

const page = (over: Partial<McpOrganizationUsage> = {}): McpOrganizationUsage =>
  ({
    orgUid: '01ORG',
    window: { seconds: 86400 },
    quotas: { creditsPerDay: { limit: 100, used: 40, fraction: 0.4 } },
    byAgent: [],
    setAt: '/api/iam/v1/mcp-policies/{scope}/{uid}',
    ...over,
  }) as McpOrganizationUsage;

describe('what the breakdown shows', () => {
  it('shows the rows when there are rows', () => {
    expect(
      breakdownState(
        page({ byAgent: [{ clientId: 'claude', agentUid: '', credits: 5, records: 2 }] }),
      ),
    ).toBe('rows');
  });

  it('says nobody spent anything when nobody did', () => {
    expect(breakdownState(page())).toBe('empty');
  });

  it('refuses to show parts under a total it could not read', () => {
    // Every agent looks cheap under an unreadable whole, and the reader
    // concludes the budget is fine.
    expect(
      breakdownState(
        page({
          quotas: { creditsPerDay: { limit: 100, used: null, unknown: 'ledger short' } },
          byAgent: [{ clientId: 'claude', agentUid: '', credits: 5, records: 2 }],
        }),
      ),
    ).toBe('unreadable');
  });

  it('treats a page that never arrived as unreadable, not as quiet', () => {
    expect(breakdownState(undefined)).toBe('unreadable');
  });
});

describe('which agent a row is', () => {
  it('keys a service agent on its own uid, not on the gateway’s client id', () => {
    // Service agents reach Runtimes through the gateway and carry *its*
    // client id. Keyed on that, an organization's pipelines collapse into
    // one row costing the sum of several.
    const rows = spendRowsOf([
      { clientId: 'gateway', agentUid: '01NIGHTLY', credits: 4, records: 1 },
      { clientId: 'gateway', agentUid: '01HOURLY', credits: 6, records: 1 },
    ]);
    expect(rows.map(row => row.id)).toEqual(['01NIGHTLY', '01HOURLY']);
  });

  it('keys a delegated agent on the client it connected as', () => {
    expect(
      spendRowsOf([{ clientId: 'claude', agentUid: '', credits: 3, records: 1 }])[0].id,
    ).toBe('claude');
  });

  it('keeps the order the gateway sent, which is biggest spender first', () => {
    const rows = spendRowsOf([
      { clientId: 'big', agentUid: '', credits: 99, records: 9 },
      { clientId: 'small', agentUid: '', credits: 1, records: 1 },
    ]);
    expect(rows.map(row => row.clientId)).toEqual(['big', 'small']);
  });

  it('gives two nameless rows distinct keys rather than colliding', () => {
    // React would drop one of them, and a row that silently disappears is
    // spend nobody is billed for on screen.
    const rows = spendRowsOf([
      { clientId: '', agentUid: '', credits: 1, records: 1 },
      { clientId: '', agentUid: '', credits: 2, records: 1 },
    ]);
    expect(new Set(rows.map(row => row.id)).size).toBe(2);
  });
});

describe('how close to the limit reads', () => {
  it('is calm well under the limit', () => {
    expect(quotaTone(0.4)).toBe('success');
  });

  it('warns before the limit, not at it', () => {
    // A bar that only reddens at 100% tells you after the refusals start.
    expect(quotaTone(0.8)).toBe('attention');
  });

  it('is loud at nine tenths', () => {
    expect(quotaTone(0.9)).toBe('danger');
  });

  it('stays loud past the limit', () => {
    expect(quotaTone(1.4)).toBe('danger');
  });
});

describe('the figures themselves', () => {
  it('writes credits to two places', () => {
    expect(amount(12.345)).toBe('12.35');
  });

  it('writes a count without a decimal point', () => {
    // "3.00 sandboxes running" reads as a measurement rather than a count.
    expect(amount(3)).toBe('3');
  });
});
