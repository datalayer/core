/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Sharing a sandbox: which name, and whose sandbox it is.
 *
 * Two things went wrong here before, and both are silent. A sandbox has two
 * names — the handle its session holds and the runtime's own — and Runtimes'
 * sharing routes take the second; sending the first gets a `403` that reads
 * as "you are not the owner". And Runtimes names the owner *inside* the
 * sharing document rather than beside it, so a dialog looking only beside it
 * draws no owner at all, which reads as a resource nobody owns.
 */

import { describe, expect, it } from 'vitest';
import { sandboxSharingUrl } from '../sandboxSharing';
import { extractOwnerPrincipals } from '../ShareAccessComponent';

describe('where a sandbox sharing lives', () => {
  it('is addressed by the runtime name', () => {
    expect(sandboxSharingUrl('https://prod1.datalayer.run', 'rt-abc')).toBe(
      'https://prod1.datalayer.run/api/runtimes/v1/runtimes/rt-abc/sharing',
    );
  });

  it('does not double the slash of a base URL that ends in one', () => {
    expect(sandboxSharingUrl('https://prod1.datalayer.run/', 'rt-abc')).toBe(
      'https://prod1.datalayer.run/api/runtimes/v1/runtimes/rt-abc/sharing',
    );
  });

  it('escapes the name rather than pasting it into a path', () => {
    expect(sandboxSharingUrl('https://x', 'a/b')).toBe(
      'https://x/api/runtimes/v1/runtimes/a%2Fb/sharing',
    );
  });

  it('has no URL for a sandbox with no runtime behind it', () => {
    // A browser or local kernel, or a binding still reserving. The caller
    // uses this answer to decide whether to offer sharing at all, so an
    // almost-URL here becomes a button that always fails.
    expect(sandboxSharingUrl('https://x', undefined)).toBeUndefined();
    expect(sandboxSharingUrl('https://x', '')).toBeUndefined();
    expect(sandboxSharingUrl('https://x', '   ')).toBeUndefined();
  });

  it('has no URL when the deployment names no Runtimes', () => {
    expect(sandboxSharingUrl('', 'rt-abc')).toBeUndefined();
    expect(sandboxSharingUrl(undefined, 'rt-abc')).toBeUndefined();
  });
});

describe('who owns a shared sandbox', () => {
  it('is read from inside the sharing document', () => {
    const owners = extractOwnerPrincipals({
      success: true,
      sharing: { runtime_name: 'rt-abc', owner_uid: 'usr-1', access: {} },
    });
    expect(owners.map(owner => owner.uid)).toEqual(['usr-1']);
  });

  it('still prefers an owner named beside it', () => {
    const owners = extractOwnerPrincipals({
      owner: { uid: 'usr-outer' },
      sharing: { owner_uid: 'usr-inner' },
    });
    expect(owners.map(owner => owner.uid)).toEqual(['usr-outer']);
  });

  it('names nobody when nothing does', () => {
    expect(extractOwnerPrincipals({ sharing: { access: {} } })).toEqual([]);
  });
});
