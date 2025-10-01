/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { DatalayerClient } from '../../index';

describe('ensureRuntime', () => {
  it('should create DatalayerClient', () => {
    const sdk = new DatalayerClient({ token: 'mock-token' });
    expect(sdk).toBeInstanceOf(DatalayerClient);
  });
});
