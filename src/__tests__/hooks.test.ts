/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { useCache } from '../hooks';

describe('hooks', () => {
  it('should export qfds constant', () => {
    expect(useCache).toBeDefined();
  });
  /*
  it('useCache should have correct value', () => {
    expect(useCache).toBe('');
  });
  it('useCache should be a string', () => {
    expect(typeof useCache).toBe('string');
  });
  */
});
