/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * How delegated work is doing, read from the OTEL service's orchestration
 * dashboard.
 *
 * Six measures: the share of executions that completed after losing sight
 * of their worker, the share of delegations that were repeats and of
 * artifacts that were superseded, the share that completed when the worker
 * itself was lost, how long workers take to accept work and to report
 * anything, and the share of the conformance scenarios each binding passes.
 *
 * The execution store records them wherever executions are held — the
 * agents service, the durable service — under the account the executions
 * belong to, and the service computes each panel from the series as they were
 * exported. Nothing here adds metric points up: the panels arrive summarised,
 * and this module only divides one panel's labels by another's. The panel ids
 * are the dashboard's own, which a contract test in the OTEL service holds to
 * the ones named here.
 *
 * @module api/orchestration/measures
 */

import { DEFAULT_SERVICE_URLS } from '../constants';
import {
  getDashboardData,
  type DashboardData,
  type DashboardDataOptions,
} from '../otel/dashboards';

/** The built-in dashboard the measures are read from. */
export const ORCHESTRATION_DASHBOARD = 'orchestration';

/** The panels each measure is read from, by the dashboard's ids. */
export const ORCHESTRATION_PANELS = {
  afterDisconnect:
    'orchestration-executions-settled-by-state-where-recovery-disconnected',
  afterWorkerLost:
    'orchestration-executions-settled-by-state-where-recovery-worker_lost',
  delegations: 'orchestration-delegations-by-outcome',
  artifacts: 'orchestration-artifacts-by-outcome',
  acceptance: 'orchestration-acceptance_seconds-by-protocol',
  firstWorkerEvent: 'orchestration-first_worker_event_seconds-by-protocol',
  conformancePassed:
    'orchestration-conformance-scenarios-by-binding-where-outcome-passed',
  conformanceFailed:
    'orchestration-conformance-scenarios-by-binding-where-outcome-failed',
} as const;

/** A part of a whole, and the rate when there is a whole to divide by. */
export interface Share {
  part: number;
  of: number;
  /** `null` when nothing was counted, which is not the same as none. */
  rate: number | null;
}

export interface OrchestrationMeasures {
  /** Executions that lost sight of their worker, and how many completed. */
  completedAfterDisconnect: Share;
  /** Executions whose worker was lost, and how many completed anyway. */
  completedAfterWorkerLost: Share;
  /** Delegations, and how many repeated a command already received. */
  duplicateDelegations: Share;
  /** Artifacts a commit settled, and how many another attempt superseded. */
  supersededArtifacts: Share;
  /** Mean seconds from an execution's creation to its acceptance, by protocol. */
  acceptanceSeconds: Record<string, number>;
  /** Mean seconds from an execution's creation to its worker's first milestone, by protocol. */
  firstWorkerEventSeconds: Record<string, number>;
  /** Conformance scenarios run against each binding, and how many passed. */
  conformance: Record<string, Share>;
  /** The panels the service could not answer, by id, and why. */
  unanswered: Record<string, string>;
}

const share = (part: number, of: number): Share => ({
  part,
  of,
  rate: of > 0 ? part / of : null,
});

/**
 * The six measures, from the dashboard's answer.
 *
 * @param data - The orchestration dashboard, as `getDashboardData` returns it.
 * @returns The measures, with the panels that did not answer named.
 */
export const orchestrationMeasures = (
  data: DashboardData,
): OrchestrationMeasures => {
  const panels = new Map(data.panels.map(panel => [panel.id, panel]));
  const unanswered: Record<string, string> = {};
  const byLabel = (id: string): Record<string, number> => {
    const panel = panels.get(id);
    if (!panel || panel.error) {
      unanswered[id] = panel?.error ?? 'The dashboard has no such panel.';
      return {};
    }
    return Object.fromEntries(
      panel.series
        .filter(entry => entry.summary !== null)
        .map(entry => [entry.label, entry.summary as number]),
    );
  };
  const total = (values: Record<string, number>): number =>
    Object.values(values).reduce((sum, value) => sum + value, 0);

  const afterDisconnect = byLabel(ORCHESTRATION_PANELS.afterDisconnect);
  const afterWorkerLost = byLabel(ORCHESTRATION_PANELS.afterWorkerLost);
  const delegations = byLabel(ORCHESTRATION_PANELS.delegations);
  const artifacts = byLabel(ORCHESTRATION_PANELS.artifacts);
  const passed = byLabel(ORCHESTRATION_PANELS.conformancePassed);
  const failed = byLabel(ORCHESTRATION_PANELS.conformanceFailed);

  const conformance: Record<string, Share> = {};
  for (const binding of new Set([...Object.keys(passed), ...Object.keys(failed)])) {
    const ok = passed[binding] ?? 0;
    conformance[binding] = share(ok, ok + (failed[binding] ?? 0));
  }

  return {
    completedAfterDisconnect: share(
      afterDisconnect.completed ?? 0,
      total(afterDisconnect),
    ),
    completedAfterWorkerLost: share(
      afterWorkerLost.completed ?? 0,
      total(afterWorkerLost),
    ),
    duplicateDelegations: share(delegations.duplicate ?? 0, total(delegations)),
    supersededArtifacts: share(artifacts.superseded ?? 0, total(artifacts)),
    acceptanceSeconds: byLabel(ORCHESTRATION_PANELS.acceptance),
    firstWorkerEventSeconds: byLabel(ORCHESTRATION_PANELS.firstWorkerEvent),
    conformance,
    unanswered,
  };
};

/**
 * The six measures for the caller's account, or the one named.
 *
 * @param token - Authentication token.
 * @param options - The window and the account to read as.
 * @param otelUrl - The OTEL service.
 * @returns The measures.
 */
export const fetchOrchestrationMeasures = async (
  token: string,
  options: DashboardDataOptions = {},
  otelUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<OrchestrationMeasures> =>
  orchestrationMeasures(
    await getDashboardData(token, ORCHESTRATION_DASHBOARD, options, otelUrl),
  );
