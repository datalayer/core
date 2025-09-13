/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import * as coreIndex from '../index';
import { BackdropContext } from '../hooks';
import { convertToLargestUnit, asArray } from '../utils';
import { createDatalayerServiceManager } from '../services';

describe('@datalayer/core - index', () => {
  it('should export BackdropContext from hooks', () => {
    expect(BackdropContext).toBeDefined();
    expect(BackdropContext).toHaveProperty('$$typeof');
    expect(typeof BackdropContext).toBe('object');
  });

  it('should export utils functions', () => {
    expect(convertToLargestUnit).toBeDefined();
    expect(asArray).toBeDefined();
  });

  it('should export DatalayerServiceManager from services', () => {
    expect(createDatalayerServiceManager).toBeDefined();
    expect(typeof createDatalayerServiceManager).toBe('function');
  });

  it('should have minimal main index exports', () => {
    const exports = Object.keys(coreIndex);
    expect(exports.length).toBe(0);
  });
});
