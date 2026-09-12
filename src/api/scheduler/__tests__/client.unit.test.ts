/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The scheduler client sends the paths the service pins, from one origin,
 * mirroring `datalayer_scheduler/api/v1/endpoints/schedules.py`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import * as client from '../client';
import { schedulerUrl } from '../request';

const options = { baseUrl: 'https://agents.example/', token: 't' };

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

describe('the scheduler URL', () => {
  it('is one origin and the v1 prefix, with no trailing slash duplicated', () => {
    expect(schedulerUrl(options, '/schedules')).toBe(
      'https://agents.example/api/scheduler/v1/schedules',
    );
  });

  it('falls back to the default scheduler origin', () => {
    expect(schedulerUrl({}, '/schedules')).toMatch(
      /^https:\/\/.+\/api\/scheduler\/v1\/schedules$/,
    );
  });

  it('leaves an empty or undefined query value out', () => {
    const url = schedulerUrl(options, '/schedules', {
      includeDisabled: undefined,
    });
    expect(query(url)).toEqual({});
  });
});

describe('the routes', () => {
  it.each([
    [
      'listSchedules',
      () => client.listSchedules(options),
      'GET',
      '/api/scheduler/v1/schedules',
    ],
    [
      'listSchedules(includeDisabled)',
      () => client.listSchedules(options, { includeDisabled: true }),
      'GET',
      '/api/scheduler/v1/schedules',
    ],
    [
      'getSchedule',
      () => client.getSchedule(options, 'sch-1'),
      'GET',
      '/api/scheduler/v1/schedules/sch-1',
    ],
    [
      'upsertSchedule',
      () =>
        client.upsertSchedule(options, {
          targetUid: 'ev-1',
          cronExpression: '0 * * * *',
        }),
      'POST',
      '/api/scheduler/v1/schedules',
    ],
    [
      'updateSchedule',
      () => client.updateSchedule(options, 'sch-1', { enabled: false }),
      'PUT',
      '/api/scheduler/v1/schedules/sch-1',
    ],
    [
      'disableSchedule',
      () => client.disableSchedule(options, 'sch-1'),
      'POST',
      '/api/scheduler/v1/schedules/sch-1/disable',
    ],
    [
      'listScheduleRuns',
      () => client.listScheduleRuns(options, 'sch-1'),
      'GET',
      '/api/scheduler/v1/schedules/sch-1/runs',
    ],
    [
      'listAllScheduleRuns',
      () => client.listAllScheduleRuns(options),
      'GET',
      '/api/scheduler/v1/schedules/runs',
    ],
  ])('%s calls %s %s', async (_name, call, method, expectedPath) => {
    await (call as () => Promise<unknown>)();
    const made = lastCall();
    expect(made.method).toBe(method);
    expect(path(made.url)).toBe(expectedPath);
    expect(made.token).toBe('t');
  });

  it('includeDisabled rides as an explicit true or false, omitted only when not asked', () => {
    void client.listSchedules(options, { includeDisabled: true });
    expect(query(lastCall().url)).toEqual({ includeDisabled: 'true' });
    void client.listSchedules(options, { includeDisabled: false });
    expect(query(lastCall().url)).toEqual({ includeDisabled: 'false' });
    void client.listSchedules(options);
    expect(query(lastCall().url)).toEqual({});
  });

  it('a schedule uid is encoded once, not twice', async () => {
    await client.getSchedule(options, 'sch one/two');
    expect(path(lastCall().url)).toBe(
      '/api/scheduler/v1/schedules/sch%20one%2Ftwo',
    );
  });

  it('upsertSchedule sends the body as given, targetKind included only when set', async () => {
    await client.upsertSchedule(options, {
      targetUid: 'ev-1',
      cronExpression: '0 * * * *',
      targetKind: 'evalset',
      config: { run_mode: 'batch' },
    });
    expect(lastCall().body).toEqual({
      targetUid: 'ev-1',
      cronExpression: '0 * * * *',
      targetKind: 'evalset',
      config: { run_mode: 'batch' },
    });
  });
});
