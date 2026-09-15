/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Sharing with an agent.
 *
 * A service agent is a principal in its own right: the grant is matched on the
 * agent's own uid, never on the people who can act through it. The dialog had
 * no bucket for one, so an agent could not be granted anything at all — and a
 * picker that wrote a field the payload did not carry would have looked like a
 * grant while granting nothing, which is the worst shape a permission dialog
 * can have.
 */

import { describe, expect, it } from 'vitest';
import {
  buildAclEntries,
  hydrateAccessFromSharing,
} from '../ShareAccessComponent';

const LEVELS = [
  { level: 'view', label: 'Viewer' },
  { level: 'update', label: 'Editor' },
] as const;

describe('hydrateAccessFromSharing', () => {
  it('keeps the agents a resource is already shared with', () => {
    const hydrated = hydrateAccessFromSharing(
      {
        access: {
          view: { userUids: ['u-1'], agentUids: ['agt-1'] },
        },
      },
      LEVELS,
    );

    expect(hydrated.view.agentUids).toEqual(['agt-1']);
    expect(hydrated.view.userUids).toEqual(['u-1']);
    // Every level carries the bucket, so a level with no agents still saves an
    // empty list rather than dropping the field.
    expect(hydrated.update.agentUids).toEqual([]);
  });

  it('defaults the agent bucket when the payload predates it', () => {
    const hydrated = hydrateAccessFromSharing(
      { access: { view: { userUids: ['u-1'] } } },
      LEVELS,
    );
    expect(hydrated.view.agentUids).toEqual([]);
  });
});

describe('buildAclEntries', () => {
  it('lists an agent as its own principal', () => {
    const hydrated = hydrateAccessFromSharing(
      { access: { view: { agentUids: ['agt-1'] } } },
      LEVELS,
    );

    const entries = buildAclEntries(hydrated, [
      'personal',
      'team',
      'organization',
      'agent',
    ]);

    expect(entries).toEqual([
      { kind: 'agent', uid: 'agt-1', levels: ['view'] },
    ]);
  });

  it('gathers the levels one agent holds', () => {
    const hydrated = hydrateAccessFromSharing(
      {
        access: {
          view: { agentUids: ['agt-1'] },
          update: { agentUids: ['agt-1'] },
        },
      },
      LEVELS,
    );

    const entries = buildAclEntries(hydrated, ['agent']);
    expect(entries).toHaveLength(1);
    expect(entries[0].levels).toEqual(['view', 'update']);
  });

  it('omits agents when the dialog does not offer that kind', () => {
    // A caller that lists only people and teams must not be handed an agent it
    // cannot render or remove.
    const hydrated = hydrateAccessFromSharing(
      {
        access: {
          view: { userUids: ['u-1'], agentUids: ['agt-1'] },
        },
      },
      LEVELS,
    );

    const entries = buildAclEntries(hydrated, ['personal', 'team']);
    expect(entries.map(entry => entry.kind)).toEqual(['personal']);
  });
});
