/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The evals client sends the paths the service pins, from one origin.
 *
 * Each function is checked for the method and the URL it produces, against
 * the same table the AI Agents service and the landings UI test
 * (BENCHMARK.md, B0-01 and B0-02). The account scope rides on every call and
 * is never duplicated; empty query values are left out; ids are encoded once.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import * as client from '../client';
import { aiAgentsUrl, evalsUrl } from '../request';

const options = {
  baseUrl: 'https://agents.example/',
  token: 't',
  accountUid: 'org-1',
};

const lastCall = () =>
  request.mock.calls[request.mock.calls.length - 1][0] as {
    url: string;
    method: string;
    body?: unknown;
    token?: string;
  };

const path = (url: string) => new URL(url).pathname;
const query = (url: string) =>
  Object.fromEntries(new URL(url).searchParams.entries());

beforeEach(() => {
  request.mockClear();
});

describe('the evals URL', () => {
  it('is one origin, the v1 prefix, and the account scope', () => {
    const url = aiAgentsUrl(options, '/evals/evalsets', {
      limit: 5,
      q: '',
      kind: undefined,
    });
    expect(url).toBe(
      'https://agents.example/api/ai-agents/v1/evals/evalsets?limit=5&account_uid=org-1',
    );
  });

  it('keeps an inline query and does not scope twice', () => {
    const url = evalsUrl(
      { ...options, accountUid: 'org-1' },
      '/live/targets?window=6h',
      {
        account_uid: 'team-2',
      },
    );
    expect(query(url)).toEqual({ window: '6h', account_uid: 'team-2' });
  });

  it('falls back to the default AI Agents origin', () => {
    expect(aiAgentsUrl({}, '/evals/evalsets')).toMatch(
      /^https:\/\/.+\/api\/ai-agents\/v1\/evals\/evalsets$/,
    );
  });
});

describe('the evals client', () => {
  const cases: Array<[string, () => Promise<unknown>, string, string]> = [
    [
      'listEvalsets',
      () => client.listEvalsets(options, { kind: 'batch' }),
      'GET',
      '/api/ai-agents/v1/evals/evalsets',
    ],
    [
      'getEvalset',
      () => client.getEvalset(options, 'e/1'),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e%2F1',
    ],
    [
      'createEvalset',
      () => client.createEvalset(options, { name: 'x' }),
      'POST',
      '/api/ai-agents/v1/evals/evalsets',
    ],
    [
      'updateEvalset',
      () => client.updateEvalset(options, 'e1', { name: 'y' }),
      'PATCH',
      '/api/ai-agents/v1/evals/evalsets/e1',
    ],
    [
      'setEvalsetPublic',
      () => client.setEvalsetPublic(options, 'e1', true),
      'PATCH',
      '/api/ai-agents/v1/evals/evalsets/e1/public',
    ],
    [
      'cloneEvalset',
      () => client.cloneEvalset(options, 'e1'),
      'POST',
      '/api/ai-agents/v1/evals/evalsets/e1/clone',
    ],
    [
      'reviseEvalset',
      () => client.reviseEvalset(options, 'e1', { investigation_id: 'inv-1' }),
      'POST',
      '/api/ai-agents/v1/evals/evalsets/e1/revisions',
    ],
    [
      'previewEvalsetPublication',
      () => client.previewEvalsetPublication(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e1/publication/preview',
    ],
    [
      'publishEvalsetPackage',
      () => client.publishEvalsetPackage(options, 'e1', { note: 'first' }),
      'POST',
      '/api/ai-agents/v1/evals/evalsets/e1/publications',
    ],
    [
      'listEvalsetPublications',
      () => client.listEvalsetPublications(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e1/publications',
    ],
    [
      'withdrawEvalsetPublication',
      () => client.withdrawEvalsetPublication(options, 'e1', 'publication-1'),
      'DELETE',
      '/api/ai-agents/v1/evals/evalsets/e1/publications/publication-1',
    ],
    [
      'getPublicEvalsetPublication',
      () => client.getPublicEvalsetPublication(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/public/evalsets/e1/publication',
    ],
    [
      'compareEvalsetLaunches',
      () => client.compareEvalsetLaunches(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e1/comparison',
    ],
    [
      'getPublicEvalsetLeaderboard',
      () => client.getPublicEvalsetLeaderboard(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/public/evalsets/e1/leaderboard',
    ],
    [
      'getSubjectUsage',
      () => client.getSubjectUsage(options, 'mocks/data-analyst'),
      'GET',
      '/api/ai-agents/v1/evals/subjects/mocks/data-analyst/usage',
    ],
    [
      'getBenchmarkCompute',
      () => client.getBenchmarkCompute(options),
      'GET',
      '/api/ai-agents/v1/evals/compute/operations',
    ],
    [
      'getSandboxProvenance',
      () => client.getSandboxProvenance(options, 'benchmark-run1-slot-0'),
      'GET',
      '/api/ai-agents/v1/evals/sandboxes/benchmark-run1-slot-0/provenance',
    ],
    [
      'searchEvals',
      () => client.searchEvals(options, { q: 'run 128' }),
      'GET',
      '/api/ai-agents/v1/evals/search',
    ],
    [
      'listDecisionsAbout',
      () => client.listDecisionsAbout(options, { evalset_id: 'e1' }),
      'GET',
      '/api/ai-agents/v1/evals/decisions',
    ],
    [
      'renameEvalset',
      () => client.renameEvalset(options, 'e1', 'z'),
      'PATCH',
      '/api/ai-agents/v1/evals/evalsets/e1/rename',
    ],
    [
      'deleteEvalset',
      () => client.deleteEvalset(options, 'e1'),
      'DELETE',
      '/api/ai-agents/v1/evals/evalsets/e1',
    ],
    [
      'listCases',
      () => client.listCases(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e1/cases',
    ],
    [
      'createCase',
      () => client.createCase(options, 'e1', { name: 'c' }),
      'POST',
      '/api/ai-agents/v1/evals/evalsets/e1/cases',
    ],
    [
      'updateCase',
      () => client.updateCase(options, 'e1', 'c1', { name: 'd' }),
      'PATCH',
      '/api/ai-agents/v1/evals/evalsets/e1/cases/c1',
    ],
    [
      'deleteCase',
      () => client.deleteCase(options, 'e1', 'c1'),
      'DELETE',
      '/api/ai-agents/v1/evals/evalsets/e1/cases/c1',
    ],
    [
      'getPublicEvalset',
      () => client.getPublicEvalset(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/public/evalsets/e1',
    ],
    [
      'getPublicEvalsetDetails',
      () => client.getPublicEvalsetDetails(options, 'e1', 30),
      'GET',
      '/api/ai-agents/v1/evals/public/evalsets/e1/details',
    ],
    [
      'listPublicRuns',
      () => client.listPublicRuns(options, 'e1', 'x1'),
      'GET',
      '/api/ai-agents/v1/evals/public/evalsets/e1/experiments/x1/runs',
    ],
    [
      'createExperiment',
      () => client.createExperiment(options, { name: 'x' }),
      'POST',
      '/api/ai-agents/v1/evals/experiments',
    ],
    [
      'listExperiments',
      () => client.listExperiments(options, { evalset_id: 'e1' }),
      'GET',
      '/api/ai-agents/v1/evals/experiments',
    ],
    [
      'getExperiment',
      () => client.getExperiment(options, 'x1'),
      'GET',
      '/api/ai-agents/v1/evals/experiments/x1',
    ],
    [
      'updateExperiment',
      () => client.updateExperiment(options, 'x1', { name: 'y' }),
      'PATCH',
      '/api/ai-agents/v1/evals/experiments/x1',
    ],
    [
      'deleteExperiment',
      () => client.deleteExperiment(options, 'x1'),
      'DELETE',
      '/api/ai-agents/v1/evals/experiments/x1',
    ],
    [
      'createRun',
      () => client.createRun(options, 'x1', { status: 'queued' }),
      'POST',
      '/api/ai-agents/v1/evals/experiments/x1/runs',
    ],
    [
      'listRuns',
      () => client.listRuns(options, 'x1', { limit: 10 }),
      'GET',
      '/api/ai-agents/v1/evals/experiments/x1/runs',
    ],
    [
      'getRun',
      () => client.getRun(options, 'r1'),
      'GET',
      '/api/ai-agents/v1/evals/runs/r1',
    ],
    [
      'deleteRun',
      () => client.deleteRun(options, 'r1'),
      'DELETE',
      '/api/ai-agents/v1/evals/runs/r1',
    ],
    [
      'compareRuns',
      () => client.compareRuns(options, ['r1', 'r2']),
      'POST',
      '/api/ai-agents/v1/evals/runs/compare',
    ],
    [
      'createLiveEvent',
      () =>
        client.createLiveEvent(options, {
          target_id: 'a',
          evaluator_name: 'e',
          metric_name: 'm',
        }),
      'POST',
      '/api/ai-agents/v1/evals/live/events',
    ],
    [
      'listLiveTargets',
      () => client.listLiveTargets(options, { window: '6h' }),
      'GET',
      '/api/ai-agents/v1/evals/live/targets',
    ],
    [
      'listLiveEvents',
      () => client.listLiveEvents(options, { target_id: 'a' }),
      'GET',
      '/api/ai-agents/v1/evals/live/events',
    ],
    [
      'deleteLiveTarget',
      () => client.deleteLiveTarget(options, 'a'),
      'DELETE',
      '/api/ai-agents/v1/evals/live/targets',
    ],
    [
      'listRunsAcross',
      () => client.listRunsAcross(options, { launch_id: 'l1' }),
      'GET',
      '/api/ai-agents/v1/evals/runs',
    ],
    [
      'cancelRun',
      () => client.cancelRun(options, 'r1'),
      'POST',
      '/api/ai-agents/v1/evals/runs/r1/cancel',
    ],
    [
      'listCaseResults',
      () => client.listCaseResults(options, 'r1', { status: 'failed' }),
      'GET',
      '/api/ai-agents/v1/evals/runs/r1/cases',
    ],
    [
      'getCaseResult',
      () => client.getCaseResult(options, 'r1', 'c1'),
      'GET',
      '/api/ai-agents/v1/evals/runs/r1/cases/c1',
    ],
    [
      'reviewCaseResult',
      () => client.reviewCaseResult(options, 'r1', 'c1', { status: 'passed' }),
      'PATCH',
      '/api/ai-agents/v1/evals/runs/r1/cases/c1/review',
    ],
    [
      'createLaunch',
      () => client.createLaunch(options, 'e1', { experiment_ids: ['x1'] }),
      'POST',
      '/api/ai-agents/v1/evals/evalsets/e1/launches',
    ],
    [
      'listLaunches',
      () => client.listLaunches(options, { evalset_id: 'e1' }),
      'GET',
      '/api/ai-agents/v1/evals/launches',
    ],
    [
      'getLaunch',
      () => client.getLaunch(options, 'l1'),
      'GET',
      '/api/ai-agents/v1/evals/launches/l1',
    ],
    [
      'cancelLaunch',
      () => client.cancelLaunch(options, 'l1'),
      'POST',
      '/api/ai-agents/v1/evals/launches/l1/cancel',
    ],
    [
      'importEvalset',
      () => client.importEvalset(options, { spec: { name: 'x' } }),
      'POST',
      '/api/ai-agents/v1/evals/evalsets/import',
    ],
    [
      'listEvalsetVersions',
      () => client.listEvalsetVersions(options, 'e1'),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e1/versions',
    ],
    [
      'getEvalsetVersion',
      () => client.getEvalsetVersion(options, 'e1', 2),
      'GET',
      '/api/ai-agents/v1/evals/evalsets/e1/versions/2',
    ],
    [
      'archiveLaunch',
      () => client.archiveLaunch(options, 'l1'),
      'POST',
      '/api/ai-agents/v1/evals/launches/l1/archive',
    ],
  ];

  for (const [name, call, method, expected] of cases) {
    it(`${name} sends ${method} ${expected}`, async () => {
      await call();
      const sent = lastCall();
      expect(sent.method).toBe(method);
      expect(path(sent.url)).toBe(expected);
      expect(query(sent.url).account_uid).toBe('org-1');
      expect(sent.token).toBe('t');
    });
  }

  it('sends the bodies the service reads', async () => {
    await client.setEvalsetPublic(options, 'e1', false);
    expect(lastCall().body).toEqual({ is_public: false });
    await client.compareRuns(options, ['r1']);
    expect(lastCall().body).toEqual({ run_ids: ['r1'] });
    await client.deleteLiveTarget(options, 'agent-1', 'agent');
    expect(query(lastCall().url)).toMatchObject({
      target_id: 'agent-1',
      target_type: 'agent',
    });
  });

  it('names the downloads without requesting them', () => {
    expect(request).not.toHaveBeenCalled();
    expect(client.evalsetExportUrl(options, 'e1', 'pydantic-evals')).toBe(
      'https://agents.example/api/ai-agents/v1/evals/evalsets/e1/export?format=pydantic-evals&account_uid=org-1',
    );
    expect(query(client.evalsetReportUrl(options, 'e1', 'csv', 20))).toEqual({
      format: 'csv',
      run_limit: '20',
      account_uid: 'org-1',
    });
  });
});
