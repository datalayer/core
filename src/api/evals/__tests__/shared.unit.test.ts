/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What other people shared with the caller (BENCHMARK.md, B4-07): one route
 * for the person, whatever account the views are scoped to.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true, total: 0, shared: [] }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import { listSharedWithMe } from '../client';

beforeEach(() => {
  request.mockClear();
});

describe('shared with me', () => {
  it('is read from the one route of the person', () => {
    void listSharedWithMe({ baseUrl: 'https://agents.example', token: 't' });
    const call = request.mock.calls[0][0] as { url: string; method: string };
    expect(call.method).toBe('GET');
    expect(new URL(call.url).pathname).toBe('/api/ai-agents/v1/evals/shared');
  });
});
