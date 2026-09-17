/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The SCIM credential client, and the two readings that are easy to get
 * backwards.
 *
 * A SCIM token *is* an organization's provisioning authority — the token is
 * the tenant, and there is nothing else identifying the caller. So the states
 * this client reports are read by somebody deciding whether people are
 * actually being deprovisioned, and the two failures both look like health:
 *
 * a record with no `revoked` field read as revoked would show a live
 * integration as stopped; and a list with tokens in it reported as "set up"
 * would show an organization whose every token is revoked, or whose directory
 * has never once called, as provisioning normally.
 *
 * The second is the dangerous one. Nobody is removed from an organization
 * whose directory is configured and silent, and a table of tokens looks
 * identical either way.
 */

import { describe, expect, it } from 'vitest';

import { scimStatus, scimBaseUrl } from '../scimTokens';
import type { ScimToken } from '../scimTokens';

const token = (over: Partial<ScimToken> = {}): ScimToken => ({
  uid: 't-1',
  orgUid: 'org-1',
  name: 'Okta',
  revoked: false,
  ...over,
});

describe('what a directory integration is actually doing', () => {
  it('reports nothing configured when there are no tokens', () => {
    expect(scimStatus([]).state).toBe('none');
  });

  it('reports revoked when every token is stopped', () => {
    // Not "active with zero live tokens". Read from a table alone this is
    // almost indistinguishable from a healthy setup, and it means nobody is
    // being deprovisioned.
    const status = scimStatus([
      token({ uid: 'a', revoked: true }),
      token({ uid: 'b', revoked: true }),
    ]);
    expect(status.state).toBe('revoked');
    expect(status.live).toHaveLength(0);
  });

  it('reports never-used when a live token has never called', () => {
    // A directory somebody configured and never switched on. It is live, it
    // is not revoked, and it has removed nobody.
    expect(scimStatus([token()]).state).toBe('never-used');
  });

  it('reports active once a live token has called', () => {
    const status = scimStatus([token({ lastUsedAt: '2026-09-17T10:00:00Z' })]);
    expect(status.state).toBe('active');
    expect(status.lastUsedAt).toBe('2026-09-17T10:00:00Z');
  });

  it('takes the most recent call across live tokens', () => {
    const status = scimStatus([
      token({ uid: 'a', lastUsedAt: '2026-09-01T00:00:00Z' }),
      token({ uid: 'b', lastUsedAt: '2026-09-16T00:00:00Z' }),
    ]);
    expect(status.lastUsedAt).toBe('2026-09-16T00:00:00Z');
  });

  it('ignores a revoked token that was once busy', () => {
    // The question is whether provisioning works *now*. A revoked token's
    // last call is history, and letting it set `lastUsedAt` would report an
    // organization as active on the strength of a credential that stopped.
    const status = scimStatus([
      token({ uid: 'old', revoked: true, lastUsedAt: '2026-09-16T00:00:00Z' }),
      token({ uid: 'new' }),
    ]);
    expect(status.state).toBe('never-used');
    expect(status.lastUsedAt).toBeUndefined();
  });

  it('is active when any live token has called, even beside an unused one', () => {
    const status = scimStatus([
      token({ uid: 'a', lastUsedAt: '2026-09-16T00:00:00Z' }),
      token({ uid: 'b' }),
    ]);
    expect(status.state).toBe('active');
  });
});

describe('the base URL an administrator copies into their directory', () => {
  it('is built rather than typed, because a typo reads as their outage', () => {
    expect(scimBaseUrl('https://prod1.datalayer.run')).toBe(
      'https://prod1.datalayer.run/api/iam/scim/v2',
    );
  });

  it('stops before the resource, which the directory appends itself', () => {
    // RFC 7644 fixes everything after this, and Okta and Entra are given a
    // base. A URL ending in /Users would be appended to, not replaced.
    expect(scimBaseUrl('https://x')).not.toMatch(/Users$/);
  });
});
