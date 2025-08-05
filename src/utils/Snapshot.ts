/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';

/**
 * Kernel snapshot description configuration.
 */
const KERNEL_SNAPSHOT_DESCRIPTION_CONFIGURATION = {
  dictionaries: [adjectives, animals],
  separator: '-'
};

/**
 * Create an unique human readable kernel snapshot name.
 *
 * @param suffix Name prefix
 * @returns The kernel snapshot name
 */
export function createRuntimeSnapshotName(suffix: string): string {
  return `${uniqueNamesGenerator(KERNEL_SNAPSHOT_DESCRIPTION_CONFIGURATION)}-${suffix}`;
}
