/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { taskFailureOf } from '../McpTask';

describe('taskFailureOf', () => {
  it('reads an empty object as no failure: the server sends {} while nothing failed', () => {
    expect(taskFailureOf({})).toBeNull();
    expect(taskFailureOf(null)).toBeNull();
    expect(taskFailureOf(undefined)).toBeNull();
  });

  it('says the reason, after its code where it has one', () => {
    expect(taskFailureOf({ reason: 'The sandbox was lost.' })).toBe(
      'The sandbox was lost.',
    );
    expect(
      taskFailureOf({
        code: 'resource_gone',
        reason: 'The sandbox was lost.',
        resourceState: {},
      }),
    ).toBe('resource_gone: The sandbox was lost.');
  });

  it('shows what it holds when it has neither', () => {
    expect(taskFailureOf({ step: 'launch' })).toBe('{"step":"launch"}');
  });
});
