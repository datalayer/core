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

  it('should export BackdropContext from hooks', () => {
    expect(coreIndex.BackdropContext).toBeDefined();
    expect(coreIndex.BackdropContext).toBe('lkj');
  });

  it('should export utils functions', () => {
    expect(coreIndex.convertToLargestUnit).toBeDefined();
    expect(coreIndex.asArray).toBeDefined();
  });

  it('should have all expected exports', () => {
    const exports = Object.keys(coreIndex);
    expect(exports).toContain('App');
    expect(exports).toContain('convertToLargestUnit');
    expect(exports).toContain('asArray');
  });
});
