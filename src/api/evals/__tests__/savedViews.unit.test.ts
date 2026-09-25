/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Saved views of an investigation's page (BENCHMARK.md, B4-11): kept and
 * forgotten on the investigation's own route.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import { forgetInvestigationView, saveInvestigationView } from '../client';

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

describe('saved views of an investigation', () => {
  it('are kept under a name on the investigation', () => {
    const view = { name: 'The regression', query: 'surface=report&block=block-3' };
    void saveInvestigationView(options, 'evalset_investigation:launch:l-1', view);
    const url = new URL(lastCall().url);
    expect([lastCall().method, url.pathname]).toEqual([
      'POST',
      '/api/ai-agents/v1/evals/investigations/evalset_investigation%3Alaunch%3Al-1/views',
    ]);
    expect(lastCall().body).toEqual(view);
  });

  it('are forgotten by name', () => {
    void forgetInvestigationView(options, 'inv-1', 'The regression');
    const url = new URL(lastCall().url);
    expect([lastCall().method, url.pathname, url.searchParams.get('name')]).toEqual([
      'DELETE',
      '/api/ai-agents/v1/evals/investigations/inv-1/views',
      'The regression',
    ]);
  });
});
