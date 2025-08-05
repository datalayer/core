/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import * as coreIndex from '../index';

describe('@datalayer/core - index', () => {
  it('should export App', () => {
    expect(coreIndex.App).toBeDefined();
    expect(typeof coreIndex.App).toBe('function');
  });

  it('should export qfds from hooks', () => {
    expect(coreIndex.qfds).toBeDefined();
    expect(coreIndex.qfds).toBe('lkj');
  });

  it('should export utils functions', () => {
    expect(coreIndex.formatString).toBeDefined();
    expect(coreIndex.addNumbers).toBeDefined();
    expect(coreIndex.isDefined).toBeDefined();
    expect(coreIndex.delay).toBeDefined();
  });

  it('should have all expected exports', () => {
    const exports = Object.keys(coreIndex);
    expect(exports).toContain('App');
    expect(exports).toContain('qfds');
    expect(exports).toContain('formatString');
    expect(exports).toContain('addNumbers');
    expect(exports).toContain('isDefined');
    expect(exports).toContain('delay');
  });
});
