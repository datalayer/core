/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string =>
  readFileSync(join(__dirname, '..', file), 'utf8');

/** The policies at /settings/policies load as skeletons, never a spinner (15 November 2026). */
describe('the policy views while they load', () => {
  it('draw PolicySkeleton and no spinner', () => {
    for (const file of [
      'Policies.tsx',
      'PersonalPolicy.tsx',
      'OrganizationPolicy.tsx',
    ]) {
      const text = read(file);
      expect([file, text.includes('<PolicySkeleton')]).toEqual([file, true]);
      expect([file, /\bSpinner\b/.test(text)]).toEqual([file, false]);
    }
    expect(read('PolicySkeleton.tsx')).toContain(
      "from '@primer/react/experimental'",
    );
  });
});
