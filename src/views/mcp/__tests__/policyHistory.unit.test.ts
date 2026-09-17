/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * How a policy change reads once it is a row.
 *
 * The audit row is terse by design — a rules list by *name*, never by value,
 * because a row that grows with the policy is a row nobody reads. Turning
 * that into a sentence is this module's job, and getting it wrong is how a
 * history that exists still fails to answer the question it is on the page
 * for.
 */

import { describe, expect, it } from 'vitest';
import {
  POLICY_AUDIT_METHODS,
  actedThrough,
  describeChange,
} from '../PolicyHistory';
import type { McpAuditEvent } from '../../../models/McpAuditEvent';

const event = (overrides: Partial<McpAuditEvent> = {}): McpAuditEvent =>
  ({
    uid: '01A',
    at: '2026-08-31T10:00:00Z',
    userUid: '01USER',
    method: 'mcp.policy.set',
    decision: 'allowed',
    ...overrides,
  }) as McpAuditEvent;

describe('a policy change, described', () => {
  it('names the rules that were set', () => {
    expect(
      describeChange(
        event({
          clientInfo: {
            scope: 'organization',
            rules: 'maxCallsPerMinute,toolDenylist',
          } as never,
        }),
      ),
    ).toBe('set maxCallsPerMinute, toolDenylist');
  });

  it('says a removal was a removal, and of which layer', () => {
    expect(
      describeChange(
        event({
          method: 'mcp.policy.remove',
          clientInfo: { scope: 'team' } as never,
        }),
      ),
    ).toBe('removed the team layer');
  });

  it('says what an empty layer means rather than printing "(none)"', () => {
    // IAM writes the literal `(none)` for a layer with no rules. Shown
    // through, it reads as a failure; the row exists to say the layer
    // narrows nothing.
    expect(
      describeChange(event({ clientInfo: { rules: '(none)' } as never })),
    ).toBe('set a layer that narrows nothing');
  });

  it('does not fall over on a row with no client info', () => {
    // A row written before a field existed, or by an older service, still
    // has to render — a history that throws is worse than one that is vague.
    expect(describeChange(event())).toBeTruthy();
  });

  it('still says which layer a removal was, when the scope is missing', () => {
    expect(describeChange(event({ method: 'mcp.policy.remove' }))).toBe(
      'removed the policy layer',
    );
  });

  it('reads the two methods IAM actually writes', () => {
    // A drawer querying a method IAM never writes is a drawer that is always
    // empty, and an empty drawer reads as "nobody has ever changed this".
    expect([...POLICY_AUDIT_METHODS]).toEqual([
      'mcp.policy.set',
      'mcp.policy.remove',
    ]);
  });
});

describe('what a change was made through', () => {
  it('is empty for somebody editing in their own browser', () => {
    // A session carries neither claim, so this reads the same as it did
    // before agents could reach the route at all.
    expect(actedThrough(event())).toBe('');
  });

  it('names the agent when one wrote the policy', () => {
    // The row this drawer exists for. An agent that can reach the policy
    // route can narrow -- or widen -- what every other agent in the
    // organization may do, and a row naming only the person tells the
    // administrator who finds it that they wrote it themselves.
    expect(actedThrough(event({ agentUid: '01AGENT' }))).toBe('01AGENT');
  });

  it('falls back to the client when there is no service agent', () => {
    expect(actedThrough(event({ clientId: 'https://claude.ai/c.json' }))).toBe(
      'https://claude.ai/c.json',
    );
  });

  it('prefers the agent over the client it ran in', () => {
    // A service agent is a named thing somebody can go and look at; a client
    // id is the software it happened to run in.
    expect(
      actedThrough(
        event({ agentUid: '01AGENT', clientId: 'https://x/c.json' }),
      ),
    ).toBe('01AGENT');
  });

  it('treats null the way the wire sends it', () => {
    // The model types both as `string | null`, and `null` must read as
    // absent rather than as the text "null" beside somebody's name.
    expect(actedThrough(event({ agentUid: null, clientId: null }))).toBe('');
  });
});
