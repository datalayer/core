/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { asUsage, usageRuntimeEngineOf } from '../Usage';

const RAW = {
  account_uid: 'a1',
  resource_uid: 'r1',
  resource_type: 'ai-agents-env',
  burning_rate: 0.01,
  credits_limit: 10,
  start_date: '2026-11-13T10:00:00Z',
  updated_at: '2026-11-13T10:05:00Z',
  metadata: {},
};

describe('the engine of a usage record', () => {
  it('is what IAM recorded from the launch', () => {
    expect(asUsage({ ...RAW, runtime_engine: 'kagent' }).runtimeEngine).toBe(
      'kagent',
    );
    expect(asUsage({ ...RAW, runtime_engine: 'agentcore' }).runtimeEngine).toBe(
      'agentcore',
    );
    expect(asUsage({ ...RAW, runtime_engine: 'datalayer' }).runtimeEngine).toBe(
      'datalayer',
    );
  });

  it('is absent on a record that says none, or one not known', () => {
    expect(asUsage(RAW).runtimeEngine).toBeUndefined();
    expect(
      asUsage({ ...RAW, runtime_engine: null }).runtimeEngine,
    ).toBeUndefined();
    expect(usageRuntimeEngineOf('lambda')).toBeUndefined();
  });
});
