/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from 'unique-names-generator';

/**
 * Kernel snapshot description configuration.
 */
const CODE_SANDBOX_SNAPSHOT_DESCRIPTION_CONFIGURATION = {
  dictionaries: [adjectives, animals],
  separator: '-',
};

/**
 * Create an unique human readable kernel snapshot name.
 *
 * @param suffix Name prefix
 * @returns The kernel snapshot name
 */
export function createSandboxSnapshotName(suffix: string): string {
  return `${uniqueNamesGenerator(CODE_SANDBOX_SNAPSHOT_DESCRIPTION_CONFIGURATION)}-${suffix}`;
}
