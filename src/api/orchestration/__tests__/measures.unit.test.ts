/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import type {
  DashboardData,
  DashboardPanelData,
} from '../../otel/dashboards';
import {
  ORCHESTRATION_PANELS,
  fetchOrchestrationMeasures,
  orchestrationMeasures,
} from '../measures';

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const panel = (
  id: string,
  summaries: Record<string, number | null>,
  extra: Partial<DashboardPanelData> = {},
): DashboardPanelData => ({
  id,
  title: id,
  metric: 'orchestration.x',
  by: 'label',
  where: {},
  agg: 'sum',
  kind: 'counter',
  series: Object.entries(summaries).map(([label, summary]) => ({
    label,
    summary,
    series: 1,
    points: [],
  })),
  ...extra,
});

const dashboard = (panels: DashboardPanelData[]): DashboardData => ({
  success: true,
  id: 'orchestration',
  title: 'Orchestration',
  account_uid: 'acc-1',
  panels,
});

const everyPanel = (): DashboardPanelData[] => [
  panel(ORCHESTRATION_PANELS.afterDisconnect, { completed: 3, failed: 1 }),
  panel(ORCHESTRATION_PANELS.afterWorkerLost, { failed: 2 }),
  panel(ORCHESTRATION_PANELS.delegations, { created: 9, duplicate: 1 }),
  panel(ORCHESTRATION_PANELS.artifacts, { committed: 4 }),
  panel(ORCHESTRATION_PANELS.acceptance, { a2a: 0.02, acp: 0.05 }),
  panel(ORCHESTRATION_PANELS.firstWorkerEvent, { a2a: 0.01, acp: null }),
  panel(ORCHESTRATION_PANELS.conformancePassed, { a2a: 6, acp: 5 }),
  panel(ORCHESTRATION_PANELS.conformanceFailed, { acp: 1 }),
];

describe('orchestrationMeasures', () => {
  it('reads each share as one label of a panel against all of them', () => {
    const measures = orchestrationMeasures(dashboard(everyPanel()));

    expect(measures.completedAfterDisconnect).toEqual({ part: 3, of: 4, rate: 0.75 });
    expect(measures.completedAfterWorkerLost).toEqual({ part: 0, of: 2, rate: 0 });
    expect(measures.duplicateDelegations).toEqual({ part: 1, of: 10, rate: 0.1 });
    expect(measures.supersededArtifacts).toEqual({ part: 0, of: 4, rate: 0 });
    expect(measures.unanswered).toEqual({});
  });

  it('keeps the latencies by protocol and leaves out one never measured', () => {
    const measures = orchestrationMeasures(dashboard(everyPanel()));

    expect(measures.acceptanceSeconds).toEqual({ a2a: 0.02, acp: 0.05 });
    expect(measures.firstWorkerEventSeconds).toEqual({ a2a: 0.01 });
  });

  it('rates conformance per binding over the scenarios it ran', () => {
    const measures = orchestrationMeasures(dashboard(everyPanel()));

    expect(measures.conformance).toEqual({
      a2a: { part: 6, of: 6, rate: 1 },
      acp: { part: 5, of: 6, rate: 5 / 6 },
    });
  });

  it('says nothing was counted rather than that none completed', () => {
    const measures = orchestrationMeasures(
      dashboard(
        everyPanel().map(entry =>
          entry.id === ORCHESTRATION_PANELS.afterDisconnect
            ? { ...entry, series: [] }
            : entry,
        ),
      ),
    );

    expect(measures.completedAfterDisconnect).toEqual({ part: 0, of: 0, rate: null });
  });

  it('names a panel the service could not answer, or does not have', () => {
    const panels = everyPanel()
      .filter(entry => entry.id !== ORCHESTRATION_PANELS.artifacts)
      .map(entry =>
        entry.id === ORCHESTRATION_PANELS.delegations
          ? { ...entry, series: [], error: 'The metrics table is unreadable.' }
          : entry,
      );

    const measures = orchestrationMeasures(dashboard(panels));

    expect(measures.unanswered).toEqual({
      [ORCHESTRATION_PANELS.delegations]: 'The metrics table is unreadable.',
      [ORCHESTRATION_PANELS.artifacts]: 'The dashboard has no such panel.',
    });
    expect(measures.duplicateDelegations.rate).toBeNull();
  });
});

describe('fetchOrchestrationMeasures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the orchestration dashboard over its window and account', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue(dashboard(everyPanel()));

    const since = new Date('2026-09-10T00:00:00Z');
    const measures = await fetchOrchestrationMeasures(
      TOKEN,
      { since, accountUid: 'org-1' },
      'https://otel.test',
    );

    expect(measures.duplicateDelegations.part).toBe(1);
    const [{ url, method }] = request.mock.calls[0] as [{ url: string; method: string }];
    expect(method).toBe('GET');
    // Nanoseconds spelled out rather than multiplied: a JavaScript number
    // holds a nanosecond timestamp only approximately.
    expect(url).toBe(
      `https://otel.test/api/otel/v1/dashboards/orchestration/data?start=${since.getTime()}000000&account_uid=org-1`,
    );
  });
});
