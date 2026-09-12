/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';

import { isSandboxUid } from '../sandboxUid';

const ULID = '01m1dzmb1anqzp1v1ng97x7214';

describe('isSandboxUid', () => {
  it('accepts a ULID in either case', () => {
    expect(isSandboxUid(ULID)).toBe(true);
    expect(isSandboxUid(ULID.toUpperCase())).toBe(true);
  });

  it('refuses what else can stand in a route', () => {
    // An agentspec id, a word the listing addresses, nothing at all.
    expect(isSandboxUid('example-analyze-excel-spreadsheet')).toBe(false);
    expect(isSandboxUid('new')).toBe(false);
    expect(isSandboxUid('')).toBe(false);
    expect(isSandboxUid(undefined)).toBe(false);
  });

  it('refuses the old Pod name rather than converting it', () => {
    // `runtime-<ulid>` was the Pod's name once; converting it is how it
    // kept travelling. It is not a runtime identifier any more.
    expect(isSandboxUid(`runtime-${ULID}`)).toBe(false);
  });

  it('refuses the name of an external sandbox', () => {
    // Daytona, E2B and Modal sandboxes are recorded under
    // `external-<provider>-<uid>`, which names a record, not a uid.
    expect(isSandboxUid(`external-daytona-${ULID}`)).toBe(false);
  });
});
