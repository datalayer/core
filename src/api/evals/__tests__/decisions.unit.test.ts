/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Review decisions (BENCHMARK.md, B4-03): recorded on a report or in an
 * investigation, on the route of the record they are made on.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import { listDecisions, recordDecision } from '../client';

const options = { baseUrl: 'https://agents.example', token: 't' };

const lastCall = () =>
  request.mock.calls[request.mock.calls.length - 1][0] as {
    url: string;
    method: string;
    body?: unknown;
  };

beforeEach(() => {
  request.mockClear();
});

describe('review decisions', () => {
  it('are recorded on the record they are made on', () => {
    const body = {
      kind: 'accepted_regression' as const,
      outcome: 'accepted_with_limitations' as const,
      scope: 'case' as const,
      scope_ref: 'duplicates',
      note: 'A known gap.',
    };
    for (const subject of ['reports', 'investigations'] as const) {
      void recordDecision(options, subject, 'uid/1', body);
      expect(lastCall().method).toBe('POST');
      expect(new URL(lastCall().url).pathname).toBe(
        `/api/ai-agents/v1/evals/${subject}/uid%2F1/decisions`,
      );
      expect(lastCall().body).toEqual(body);
    }
  });

  it('are read from the same route', () => {
    void listDecisions(options, 'reports', 'report-1');
    expect(lastCall().method).toBe('GET');
    expect(new URL(lastCall().url).pathname).toBe(
      '/api/ai-agents/v1/evals/reports/report-1/decisions',
    );
  });
});
