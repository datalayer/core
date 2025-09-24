/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { performCleanup } from './cleanup-shared';

/**
 * Global setup that runs once before all tests
 */
export async function setup() {
  await performCleanup('setup');
}

export default setup;
