/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { qfds } from '../hooks';

describe('hooks', () => {
  it('should export qfds constant', () => {
    expect(qfds).toBeDefined();
  });

  it('qfds should have correct value', () => {
    expect(qfds).toBe('lkj');
  });

  it('qfds should be a string', () => {
    expect(typeof qfds).toBe('string');
  });
});
