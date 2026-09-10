/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Reports as objects (BENCHMARK.md, B4-04): the paths the AI Agents service
 * pins, the move sent as a state, and a regeneration that names its runs
 * only when it is given some.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import {
  createReport,
  getReport,
  listReports,
  moveReport,
  regenerateReport,
  reportExportUrl,
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

describe('reports', () => {
  it('are written over runs of a benchmark', () => {
    void createReport(options, {
      evalset_id: 'evalset-1',
      launch_ids: ['launch-1'],
    });
    expect([lastCall().method, path()]).toEqual([
      'POST',
      '/api/ai-agents/v1/evals/reports',
    ]);
    expect(lastCall().body).toEqual({
      evalset_id: 'evalset-1',
      launch_ids: ['launch-1'],
    });
  });

  it('are listed by benchmark, run and state, and read one at a time', () => {
    void listReports(options, { launch_id: 'launch-1', state: 'approved' });
    expect(path()).toBe('/api/ai-agents/v1/evals/reports');
    expect(
      Object.fromEntries(new URL(lastCall().url).searchParams.entries()),
    ).toEqual({ launch_id: 'launch-1', state: 'approved' });
    void getReport(options, 'report/1');
    expect(path()).toBe('/api/ai-agents/v1/evals/reports/report%2F1');
  });

  it('move by the state they are moved to', () => {
    void moveReport(options, 'report-1', {
      state: 'in_review',
      reviewer_uids: ['reviewer-1'],
    });
    expect([lastCall().method, path()]).toEqual([
      'POST',
      '/api/ai-agents/v1/evals/reports/report-1/state',
    ]);
    expect(lastCall().body).toEqual({
      state: 'in_review',
      reviewer_uids: ['reviewer-1'],
    });
  });

  it('are regenerated over the runs named, or the same ones', () => {
    void regenerateReport(options, 'report-1', ['launch-2']);
    expect(path()).toBe('/api/ai-agents/v1/evals/reports/report-1/regenerate');
    expect(lastCall().body).toEqual({ launch_ids: ['launch-2'] });
    void regenerateReport(options, 'report-1');
    expect(lastCall().body).toEqual({});
  });

  it('are downloaded as they were written, from an address the browser opens', () => {
    const url = new URL(reportExportUrl(options, 'report/1', 'csv'));
    expect(url.pathname).toBe(
      '/api/ai-agents/v1/evals/reports/report%2F1/export',
    );
    expect(url.searchParams.get('format')).toBe('csv');
    expect(
      new URL(reportExportUrl(options, 'report-1')).searchParams.get('format'),
    ).toBe('markdown');
  });
});
