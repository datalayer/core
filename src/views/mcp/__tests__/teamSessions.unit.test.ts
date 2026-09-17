/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which "disconnect all" a control actually calls.
 *
 * There are two, they read identically in a screenshot, and they differ by
 * whose sessions end. `useDisconnectEveryAgent` ends the signed-in person's
 * own grants; `useDisconnectEveryAgentInTeam` ends every grant consented in
 * one team, whoever holds it. A team page wired to the first would tell an
 * owner it had ended their team's sessions and end only their own — leaving
 * everybody else's agents connected with nothing saying so, which is the
 * failure this control exists to prevent.
 *
 * The wiring, not the component. Rendering it would prove a button exists;
 * the question is which mutation it reaches, and the only way to get that
 * wrong is to import the other hook.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string): string =>
  readFileSync(join(__dirname, '..', file), 'utf8');

const teamPolicies = read('TeamPolicies.tsx');
const connectedAgents = read('ConnectedAgents.tsx');

describe('the team’s “end every session” control', () => {
  it('calls the team hook', () => {
    expect(teamPolicies).toContain('useDisconnectEveryAgentInTeam');
  });

  it('never calls the personal one', () => {
    // The whole bug: same words, same shape, different blast radius. A
    // regex rather than `toContain`, because the team hook's name contains
    // the personal hook's as a prefix.
    expect(teamPolicies).not.toMatch(/useDisconnectEveryAgent\b(?!InTeam)/);
  });

  it('passes the team it is showing, not whatever team is first', () => {
    // The mutation takes a uid. Handed the wrong one it would end another
    // team's sessions and report success.
    expect(teamPolicies).toMatch(/disconnect\.mutate\(\s*teamUid\b/);
  });

  it('asks before ending them', () => {
    // Live sessions, ended now, not reversible. A one-click danger button
    // on a settings page is how somebody signs out a team by mis-clicking.
    expect(teamPolicies).toContain('Dialog');
    expect(teamPolicies).toMatch(/End every session in/);
  });

  it('is kept out of the policy form’s Save', () => {
    // Saving a policy is reversible and takes effect on the next call; this
    // ends sessions now. One button doing both would sign a team out
    // whenever somebody adjusted a cap.
    expect(teamPolicies).not.toMatch(/apply[\s\S]{0,400}disconnect\.mutate/);
  });
});

describe('the personal “disconnect all” is still the personal one', () => {
  it('calls the personal hook and not the team one', () => {
    // The other direction of the same mistake: a person's own list of
    // grants must not end a whole team's.
    expect(connectedAgents).toMatch(/useDisconnectEveryAgent\b(?!InTeam)/);
    expect(connectedAgents).not.toContain('useDisconnectEveryAgentInTeam');
  });
});
