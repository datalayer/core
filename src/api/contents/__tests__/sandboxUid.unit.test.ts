/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';

import {
  RuntimeNameNotAUid,
  assertSandboxUid,
  runtimeNameFromSandboxUid,
  sandboxUidFromRuntimeName,
} from '../sandboxUid';

const ULID = '01m1dzmb1anqzp1v1ng97x7214';
const POD_NAME = `runtime-${ULID}`;

describe('assertSandboxUid', () => {
  it('refuses a runtime pod name, and says which uid was meant', () => {
    // The whole point of throwing rather than converting: a caller that sends
    // the Pod name is named in the stack, instead of the mistake surfacing as
    // a 500 from Contents that the browser reports as "Network Error".
    expect(() => assertSandboxUid(POD_NAME)).toThrow(RuntimeNameNotAUid);
    expect(() => assertSandboxUid(POD_NAME)).toThrow(ULID);
  });

  it('passes a uid through', () => {
    expect(assertSandboxUid(ULID)).toBe(ULID);
  });

  it('passes a non-Datalayer sandbox identifier through', () => {
    // Daytona, E2B and Modal name their own; there is no ULID to check.
    expect(assertSandboxUid('daytona-7f3c')).toBe('daytona-7f3c');
  });
});

describe('sandboxUidFromRuntimeName', () => {
  it('converts on purpose, for the callers that only hold a pod name', () => {
    expect(sandboxUidFromRuntimeName(POD_NAME)).toBe(ULID);
    expect(sandboxUidFromRuntimeName(POD_NAME)).toHaveLength(26);
  });

  it('is idempotent, so a caller need not know which it holds', () => {
    expect(sandboxUidFromRuntimeName(ULID)).toBe(ULID);
    expect(sandboxUidFromRuntimeName(sandboxUidFromRuntimeName(POD_NAME))).toBe(
      ULID,
    );
  });
});

describe('runtimeNameFromSandboxUid', () => {
  it('gives the Pod name for a uid', () => {
    // Route parameters and `runtime_name` fields carry the Pod name, so
    // anything addressing `/runtimes/{name}/…` needs one.
    expect(runtimeNameFromSandboxUid('01M1DZMB1ANQZP1V1NG97X7214')).toBe(
      'runtime-01M1DZMB1ANQZP1V1NG97X7214',
    );
  });

  it('leaves a Pod name alone, so calling it twice is calling it once', () => {
    const name = 'runtime-01M1DZMB1ANQZP1V1NG97X7214';
    expect(runtimeNameFromSandboxUid(name)).toBe(name);
    expect(runtimeNameFromSandboxUid(runtimeNameFromSandboxUid(name))).toBe(name);
  });

  it('round-trips with the other direction', () => {
    const uid = '01M1DZMB1ANQZP1V1NG97X7214';
    expect(sandboxUidFromRuntimeName(runtimeNameFromSandboxUid(uid))).toBe(uid);
  });

  it('does not name a sandbox that has no uid to name', () => {
    // Daytona, E2B and Modal name their own; prefixing one would address a
    // Pod that does not exist.
    expect(runtimeNameFromSandboxUid('')).toBe('');
  });
});
