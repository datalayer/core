/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { performCleanup } from './cleanup-shared';

/**
 * Global teardown that runs once after all tests
 */
export async function teardown() {
  await performCleanup('teardown');
}

export default teardown;
