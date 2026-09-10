/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The orchestration client reaches the control plane only through the
 * operations generated from its document.
 *
 * Each function is checked for the method and the path it produces against
 * `ORCHESTRATION_API`, so a function that spelled a path of its own — or an
 * operation that left the document — fails here.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import * as client from '../client';
import { ORCHESTRATION_API } from '../generated';

const options = {
  baseUrl: 'https://agents.example/',
  token: 't',
  accountUid: 'org-1',
};

const lastCall = () =>
  request.mock.calls[request.mock.calls.length - 1][0] as unknown as {
    url: string;
    method: string;
    body?: unknown;
    token?: string;
  };

const generated = (operation: string) =>
  ORCHESTRATION_API.find(one => one.operation === operation)!;

const binding = {
  agentId: 'a2a-researcher',
  capability: 'web.research',
  protocol: 'a2a' as const,
};

beforeEach(() => {
  request.mockClear();
});

describe('the orchestration client', () => {
  const commands: Array<[string, () => Promise<unknown>]> = [
    [
      'agents.discover',
      () => client.discoverAgents(options, { protocols: ['a2a'] }),
    ],
    [
      'agents.create',
      () =>
        client.createAgent(options, {
          idempotencyKey: 'k',
          agentId: 'a',
          protocol: 'acp',
        }),
    ],
    [
      'agents.attach',
      () =>
        client.attachAgent(options, {
          idempotencyKey: 'k',
          agentId: 'a',
          protocol: 'a2a',
        }),
    ],
    [
      'executions.delegate',
      () =>
        client.delegateExecution(options, {
          idempotencyKey: 'k',
          agent: binding,
          objective: { goal: 'g' },
        }),
    ],
    [
      'executions.steer',
      () =>
        client.steerExecution(options, {
          idempotencyKey: 'k',
          executionId: 'e',
          instructions: 'i',
        }),
    ],
    [
      'executions.pause',
      () =>
        client.pauseExecution(options, {
          idempotencyKey: 'k',
          executionId: 'e',
        }),
    ],
    [
      'executions.resume',
      () =>
        client.resumeExecution(options, {
          idempotencyKey: 'k',
          executionId: 'e',
        }),
    ],
    [
      'executions.cancel',
      () =>
        client.cancelExecution(options, {
          idempotencyKey: 'k',
          executionId: 'e',
        }),
    ],
    [
      'executions.checkpoint',
      () =>
        client.checkpointExecution(options, {
          idempotencyKey: 'k',
          executionId: 'e',
        }),
    ],
    [
      'executions.collect',
      () => client.collectExecution(options, { executionId: 'e' }),
    ],
    [
      'executions.terminate',
      () =>
        client.terminateExecution(options, {
          idempotencyKey: 'k',
          executionId: 'e',
        }),
    ],
  ];

  it.each(commands)(
    'sends %s as the document says',
    async (operation, send) => {
      await send();
      const call = lastCall();
      expect(call.method).toBe(generated(operation).method);
      expect(new URL(call.url).pathname).toBe(generated(operation).path);
      expect(new URL(call.url).searchParams.get('account_uid')).toBe('org-1');
      expect(call.token).toBe('t');
      expect(call.body).toBeDefined();
    },
  );

  it('fills and encodes the path of a read', async () => {
    await client.getExecution(options, 'exec 1');
    expect(lastCall().method).toBe('GET');
    expect(lastCall().url).toBe(
      'https://agents.example/api/ai-agents/v1/orchestration/executions/exec%201?account_uid=org-1',
    );
  });

  it('lists a tree by its root, leaving out what was not asked', async () => {
    await client.listExecutions(options, {
      rootExecutionId: 'exec_1',
      status: 'running',
    });
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe(generated('executions.list').path);
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      rootExecutionId: 'exec_1',
      status: 'running',
      account_uid: 'org-1',
    });
  });

  it('refuses an operation the control plane does not have, and a missing parameter', () => {
    expect(() => client.operationPath('executions.teleport')).toThrow(
      /no operation/,
    );
    expect(() => client.operationPath('executions.get')).toThrow(
      /execution_id/,
    );
  });

  it('builds the subscription URL from the document too', () => {
    const url = new URL(
      client.operationUrl(
        options,
        'executions.subscribe',
        { execution_id: 'exec_1' },
        { includeChildren: true },
      ),
    );
    expect(url.pathname).toBe(
      '/api/ai-agents/v1/orchestration/executions/exec_1/events',
    );
    expect(url.searchParams.get('includeChildren')).toBe('true');
  });
});
