/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Reading the policy as one of your agents rather than as yourself.
 *
 * "What applies" has no single answer once somebody has connected more than
 * one agent: a client admitted by one organization and not another, a scope
 * one grant carries and the next does not. The page used to answer for the
 * reader's own token and not say which — an answer to a question nobody
 * asked, and indistinguishable from the answer they wanted.
 *
 * The gateway has taken an `agent` filter all along; nothing offered one.
 */

import { describe, expect, it } from 'vitest';
import { policyFiltersOf } from '../Policies';

describe('previewing the policy as an agent', () => {
  it('asks about nobody in particular when nobody is chosen', () => {
    // The reader's own token, which is the default and the honest one.
    expect(policyFiltersOf('')).toEqual({ agent: undefined });
  });

  it('asks about the agent that was chosen', () => {
    expect(policyFiltersOf('https://claude.ai/.well-known/mcp-client.json')).toEqual({
      agent: 'https://claude.ai/.well-known/mcp-client.json',
    });
  });

  it('treats a blank choice as nobody rather than as an agent named ""', () => {
    // An empty `agent` sent as a filter is a query for an agent whose client
    // id is the empty string, which matches nothing — a table that renders
    // empty and looks like a policy that grants nothing.
    expect(policyFiltersOf('   ')).toEqual({ agent: undefined });
  });
});
