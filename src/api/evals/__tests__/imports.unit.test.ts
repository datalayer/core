/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * CI reports imported as snapshots (BENCHMARK.md, B4-09): the file's text
 * sent in a JSON body to its benchmark, the imports read back, and Continue
 * investigation on the import's own route.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import {
  continueReportImport,
  getReportImport,
  importReport,
  listReportImports,
} from '../client';

const options = { baseUrl: 'https://agents.example', token: 't' };

const lastCall = () =>
  request.mock.calls[request.mock.calls.length - 1][0] as {
    url: string;
    method: string;
    body?: unknown;
  };

const path = () => new URL(lastCall().url).pathname;

beforeEach(() => {
  request.mockClear();
});

describe('imported CI reports', () => {
  it('are sent as their text to their benchmark', () => {
    const body = {
      format: 'csv' as const,
      content: 'row_type,run_id\nrun,run-1\n',
      name: 'report.csv',
    };
    void importReport(options, 'evalset/1', body);
    expect([lastCall().method, path()]).toEqual([
      'POST',
      '/api/ai-agents/v1/evals/evalsets/evalset%2F1/reports/import',
    ]);
    expect(lastCall().body).toEqual(body);
  });

  it('are listed on their benchmark and read one at a time', () => {
    void listReportImports(options, 'evalset-1');
    expect(path()).toBe(
      '/api/ai-agents/v1/evals/evalsets/evalset-1/reports/imports',
    );
    void getReportImport(options, 'import-1');
    expect(path()).toBe('/api/ai-agents/v1/evals/report-imports/import-1');
  });

  it('are continued on their own route', () => {
    void continueReportImport(options, 'import-1');
    expect([lastCall().method, path()]).toEqual([
      'POST',
      '/api/ai-agents/v1/evals/report-imports/import-1/continue',
    ]);
  });
});
