/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The one vocabulary for what a run and a case are doing.
 *
 * The service stores `status` as free text and its writers disagreed over
 * time (`queued`, `init`, `pending`, `running`, `completed`, `failed`,
 * `error`, `success`, `done`, …). This is the same mapping as
 * `agent_runtimes.evals.status` in Python: every word a writer has used maps
 * onto the product vocabulary of BENCHMARK.md section 11.4, and "finished" is
 * answered once. A word nobody has used maps to itself, lower-cased, so it is
 * visible rather than misread.
 *
 * @module api/evals/status
 */

export const RUN_STATUSES = [
  'queued',
  'provisioning',
  'running',
  'scoring',
  'completed',
  'failed',
  'review',
  'blocked',
  'cancelled',
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export const CASE_STATUSES = [
  'waiting',
  'provisioning',
  'running',
  'scoring',
  'passed',
  'failed',
  'review',
  'blocked',
  'cancelled',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const TERMINAL_RUN_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'failed',
  'cancelled',
]);
export const TERMINAL_CASE_STATUSES: ReadonlySet<string> = new Set([
  'passed',
  'failed',
  'cancelled',
]);

const LEGACY_RUN_STATUS: Record<string, RunStatus> = {
  '': 'queued',
  init: 'queued',
  pending: 'queued',
  queued: 'queued',
  provisioning: 'provisioning',
  starting: 'provisioning',
  running: 'running',
  in_progress: 'running',
  scoring: 'scoring',
  evaluating: 'scoring',
  completed: 'completed',
  complete: 'completed',
  success: 'completed',
  succeeded: 'completed',
  passed: 'completed',
  done: 'completed',
  finished: 'completed',
  failed: 'failed',
  failure: 'failed',
  error: 'failed',
  errored: 'failed',
  review: 'review',
  needs_review: 'review',
  blocked: 'blocked',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  aborted: 'cancelled',
};

const LEGACY_CASE_STATUS: Record<string, CaseStatus> = {
  '': 'waiting',
  waiting: 'waiting',
  queued: 'waiting',
  pending: 'waiting',
  provisioning: 'provisioning',
  running: 'running',
  scoring: 'scoring',
  passed: 'passed',
  pass: 'passed',
  success: 'passed',
  completed: 'passed',
  failed: 'failed',
  fail: 'failed',
  error: 'failed',
  review: 'review',
  needs_review: 'review',
  blocked: 'blocked',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  skipped: 'cancelled',
};

const word = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, '_');

/** The section 11.4 word for a run status, whatever a writer wrote. */
export const normalizeRunStatus = (value: unknown): RunStatus | string => {
  const key = word(value);
  return LEGACY_RUN_STATUS[key] ?? key;
};

/** The section 11.4 word for a case status. */
export const normalizeCaseStatus = (value: unknown): CaseStatus | string => {
  const key = word(value);
  return LEGACY_CASE_STATUS[key] ?? key;
};

/** Whether a run with this status is over. */
export const isTerminalRunStatus = (value: unknown): boolean =>
  TERMINAL_RUN_STATUSES.has(normalizeRunStatus(value));

/** Whether a case with this status is over. */
export const isTerminalCaseStatus = (value: unknown): boolean =>
  TERMINAL_CASE_STATUSES.has(normalizeCaseStatus(value));
