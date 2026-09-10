/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Sharing a benchmark, one of its runs or an investigation (BENCHMARK.md,
 * B4-05): the paths the AI Agents service pins, the grants sent as the
 * levels named and nothing else, and the permissions read from the record's
 * own route.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import {
  getEvalsPermissions,
  getEvalsSharing,
  updateEvalsSharing,
} from '../client';

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

describe('the sharing of evals records', () => {
  it('reads the sharing of each record on its own route', () => {
    for (const record of ['evalsets', 'launches', 'investigations'] as const) {
      void getEvalsSharing(options, record, 'id/1');
      expect(lastCall().method).toBe('GET');
      expect(new URL(lastCall().url).pathname).toBe(
        `/api/ai-agents/v1/evals/${record}/id%2F1/sharing`,
      );
    }
  });

  it('sends the levels it names under `access`, and nothing else', () => {
    void updateEvalsSharing(options, 'launches', 'launch-1', {
      review: { teamUids: ['team-1'] },
    });
    expect(lastCall().method).toBe('PUT');
    expect(new URL(lastCall().url).pathname).toBe(
      '/api/ai-agents/v1/evals/launches/launch-1/sharing',
    );
    expect(lastCall().body).toEqual({
      access: { review: { teamUids: ['team-1'] } },
    });
  });

  it('asks for the caller’s role on the record', () => {
    void getEvalsPermissions(options, 'investigations', 'inv-1');
    expect(lastCall().method).toBe('GET');
    expect(new URL(lastCall().url).pathname).toBe(
      '/api/ai-agents/v1/evals/investigations/inv-1/permissions',
    );
  });
});
