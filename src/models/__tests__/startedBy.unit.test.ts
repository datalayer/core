/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which of your running runtimes you started, and which an agent did.
 *
 * The reservation has carried the answer since agents could make one, and
 * nothing showed it. The tests below are about the two ways of getting it
 * wrong: reading a service agent as the gateway, and reading a person as an
 * agent whose name went missing.
 */

import { describe, expect, it } from 'vitest';
import {
  AGENT_UID_KEY,
  CLIENT_ID_KEY,
  startedBy,
  startedBySearchTerms,
} from '../StartedBy';

const map = (entries: Record<string, string>) =>
  new Map<string, unknown>(Object.entries(entries));

describe('who started a runtime', () => {
  it('is you when the record carries no agent', () => {
    // Not "unknown": that reads as an agent whose name we failed to read,
    // and the truth is that nobody's agent was involved.
    expect(startedBy(map({})).kind).toBe('person');
    expect(startedBy(map({})).label).toBe('You');
  });

  it('is the client an agent connected as', () => {
    const who = startedBy(map({ [CLIENT_ID_KEY]: 'claude' }));
    expect(who.kind).toBe('agent');
    expect(who.label).toBe('claude');
  });

  it('is the service agent itself, not the gateway it came through', () => {
    // The one that decides the order. A service agent reaching Runtimes
    // through the MCP gateway carries the *gateway's* client id; read the
    // other way round, every pipeline in an organization is the same agent.
    const who = startedBy(
      map({ [CLIENT_ID_KEY]: 'gateway', [AGENT_UID_KEY]: '01NIGHTLY' }),
    );
    expect(who.kind).toBe('service-agent');
    expect(who.label).toBe('01NIGHTLY');
    expect(who.clientId).toBe('gateway');
  });

  it('reads a plain object as well as the Map the hook builds', () => {
    expect(startedBy({ [CLIENT_ID_KEY]: 'cursor' }).label).toBe('cursor');
  });

  it('treats no metadata at all as a person', () => {
    expect(startedBy(undefined).kind).toBe('person');
    expect(startedBy(null).kind).toBe('person');
  });

  it('treats a blank dimension as absent rather than as a nameless agent', () => {
    // A row labelled with the empty string is a row nobody can act on.
    expect(startedBy(map({ [CLIENT_ID_KEY]: '   ' })).kind).toBe('person');
  });

  it('ignores a dimension that is not a string', () => {
    expect(startedBy({ [CLIENT_ID_KEY]: 42 }).kind).toBe('person');
  });
});

describe('what the search box matches', () => {
  it('finds every agent-started runtime under one word', () => {
    expect(startedBySearchTerms(map({ [CLIENT_ID_KEY]: 'claude' }))).toContain(
      'agent',
    );
    expect(
      startedBySearchTerms(map({ [AGENT_UID_KEY]: '01NIGHTLY' })),
    ).toContain('agent');
  });

  it('finds one client by name', () => {
    expect(startedBySearchTerms(map({ [CLIENT_ID_KEY]: 'cursor' }))).toContain(
      'cursor',
    );
  });

  it('does not make your own runtimes match "agent"', () => {
    // Otherwise filtering for agents returns everything, which is the same
    // as having no filter and looks like one that works.
    expect(startedBySearchTerms(map({}))).not.toContain('agent');
  });

  it('finds a service agent by its uid and by its kind', () => {
    const terms = startedBySearchTerms(map({ [AGENT_UID_KEY]: '01HOURLY' }));
    expect(terms).toContain('01HOURLY');
    expect(terms).toContain('service-agent');
  });
});
