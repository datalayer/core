/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { DatalayerCoreClient } from '../../index';

describe('ensureRuntime', () => {
  it('should create DatalayerCoreClient', () => {
    const client = new DatalayerCoreClient({ token: 'mock-token' });
    expect(client).toBeInstanceOf(DatalayerCoreClient);
  });
});
