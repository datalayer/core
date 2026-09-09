/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The organization overview, as the Enterprise console reads it.
 *
 * `refusals` is a list of rows — reason and count — and it has to be: the
 * console adds the counts up for "Refusals today" and lists the reasons,
 * and the wire converter camel-cases every key it meets, so a map keyed by
 * reason would arrive with `rate_limit` renamed. The gateway sends rows for
 * that reason; this pins the shape the console depends on, from the wire
 * to the sum.
 */

import { describe, expect, it } from 'vitest';
import { fromWire } from '../gateway';
import type { McpOrganizationOverview } from '../organizations';

const wire = {
  org_uid: 'org-a',
  at: '2026-09-09T06:00:00Z',
  agents: { active_today: 2, delegated: 2, items: [] },
  runs: { today: 6, succeeded: 3, failed: 3, success_rate: 0.5 },
  refusals: [
    { reason: 'rate_limit', count: 3 },
    { reason: 'scope', count: 2 },
  ],
  compliance: [],
};

describe('the overview’s refusals', () => {
  it('arrive as rows, with the reasons as they were sent', () => {
    const overview = fromWire<McpOrganizationOverview>(wire);
    expect(Array.isArray(overview.refusals)).toBe(true);
    expect(overview.refusals.map(row => row.reason)).toEqual([
      'rate_limit',
      'scope',
    ]);
  });

  it('add up to the day’s total the console shows', () => {
    const overview = fromWire<McpOrganizationOverview>(wire);
    expect(overview.refusals.reduce((sum, row) => sum + row.count, 0)).toBe(5);
  });

  it('would lose their reasons as a map — which is why they are not one', () => {
    // The converter renames keys, not values: the shape the gateway used to
    // send would have come back with its reasons rewritten.
    const asMap = fromWire<{ byReason: Record<string, number> }>({
      by_reason: { rate_limit: 3 },
    });
    expect(asMap.byReason).toEqual({ rateLimit: 3 });
  });
});
