/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Every status word ever written maps, the same way the Python side maps it.
 */

import { describe, expect, it } from 'vitest';
import {
  CASE_STATUSES,
  RUN_STATUSES,
  isTerminalCaseStatus,
  isTerminalRunStatus,
  normalizeCaseStatus,
  normalizeRunStatus,
} from '../status';

const OBSERVED = [
  'queued',
  'init',
  'pending',
  'running',
  'completed',
  'failed',
  'error',
  'cancelled',
  'success',
  'succeeded',
  'passed',
  'done',
  '',
];

describe('the run status vocabulary', () => {
  it('maps every observed word into the vocabulary', () => {
    for (const value of OBSERVED) {
      expect(RUN_STATUSES as readonly string[]).toContain(
        normalizeRunStatus(value),
      );
    }
  });

  it('answers finished once', () => {
    for (const value of [
      'completed',
      'success',
      'done',
      'failed',
      'error',
      'Cancelled',
      'canceled',
    ]) {
      expect(isTerminalRunStatus(value)).toBe(true);
    }
    for (const value of [
      'queued',
      'init',
      'pending',
      'running',
      'scoring',
      'review',
      'blocked',
      '',
    ]) {
      expect(isTerminalRunStatus(value)).toBe(false);
    }
  });

  it('shows an unknown word as itself', () => {
    expect(normalizeRunStatus('Exploding')).toBe('exploding');
    expect(isTerminalRunStatus('exploding')).toBe(false);
  });
});

describe('the case status vocabulary', () => {
  it('maps and finishes', () => {
    expect(normalizeCaseStatus('pass')).toBe('passed');
    expect(normalizeCaseStatus('skipped')).toBe('cancelled');
    expect(normalizeCaseStatus(undefined)).toBe('waiting');
    expect(CASE_STATUSES as readonly string[]).toContain(
      normalizeCaseStatus('needs-review'),
    );
    expect(isTerminalCaseStatus('failed')).toBe(true);
    expect(isTerminalCaseStatus('scoring')).toBe(false);
  });
});
