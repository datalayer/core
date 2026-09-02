/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Who started a runtime: a person, one of their agents, or a service agent.
 *
 * The reservation has carried this since agents could make one — IAM writes
 * `client_id_s` and `agent_uid_s` onto the usage record's metadata, and
 * `useUsages` already hands the whole map to the views. Nothing displayed
 * it, so a person looking at their running runtimes could not tell which of
 * them they had started and which an agent had, on a platform whose premise
 * is that agents start things on your behalf.
 *
 * The distinction that matters is **agent versus service agent**, not
 * "automated versus not". A delegated agent runs as you, spends your
 * credits, and stops when you disconnect it. A service agent is the
 * organization's own principal with its own key: it keeps running when the
 * person who set it up leaves, and it is the row somebody has to go and turn
 * off. Told apart, one is "I did that yesterday" and the other is "who owns
 * this".
 *
 * @module models/StartedBy
 */

/** The Solr field names IAM writes the dimensions on. */
export const CLIENT_ID_KEY = 'client_id_s';
export const AGENT_UID_KEY = 'agent_uid_s';

export type StartedByKind = 'person' | 'agent' | 'service-agent';

export interface StartedBy {
  kind: StartedByKind;
  /** What to show in a cell: a client id, an agent uid, or "You". */
  label: string;
  /** The MCP client it connected as, where there is one. */
  clientId: string;
  /** The service agent's uid, where it is one. */
  agentUid: string;
}

/** Metadata as `useUsages` builds it, or as a plain object. */
export type UsageMetadata =
  | Map<string, unknown>
  | Record<string, unknown>
  | null
  | undefined;

const read = (metadata: UsageMetadata, key: string): string => {
  if (!metadata) {
    return '';
  }
  const value =
    metadata instanceof Map
      ? metadata.get(key)
      : (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Who started this reservation.
 *
 * `agent_uid_s` decides before `client_id_s`, because a service agent
 * reaching Runtimes through the MCP gateway carries **the gateway's** client
 * id: read the other way round, every one of an organization's pipelines
 * would show as the same agent.
 *
 * A record with neither dimension is a person's own work. It is *not* an
 * agent whose name we failed to read, and saying "unknown" would suggest it
 * was — so the answer is the reader themselves.
 */
export const startedBy = (metadata: UsageMetadata): StartedBy => {
  const agentUid = read(metadata, AGENT_UID_KEY);
  const clientId = read(metadata, CLIENT_ID_KEY);
  if (agentUid) {
    return { kind: 'service-agent', label: agentUid, clientId, agentUid };
  }
  if (clientId) {
    return { kind: 'agent', label: clientId, clientId, agentUid: '' };
  }
  return { kind: 'person', label: 'You', clientId: '', agentUid: '' };
};

/**
 * The words a search box matches on for this row.
 *
 * "agent" matches every agent-started runtime, the client id matches one
 * client, and "you" matches your own — so the filter the plan asks for is the
 * search box that is already there rather than a second control beside it.
 */
export const startedBySearchTerms = (metadata: UsageMetadata): string => {
  const who = startedBy(metadata);
  if (who.kind === 'person') {
    return 'you person';
  }
  if (who.kind === 'service-agent') {
    return `agent service-agent ${who.agentUid} ${who.clientId}`.trim();
  }
  return `agent ${who.clientId}`;
};

export default startedBy;
