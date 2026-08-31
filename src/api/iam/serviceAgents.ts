/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An organization's service agents: agents that are principals rather than
 * a person's proxy.
 *
 * A connected agent is a grant — somebody's authority, narrowed to one
 * client, dying with their account. A service agent is the other kind: it
 * belongs to the organization, holds its own key, spends under its own name
 * and outlives whoever set it up. An organization whose nightly pipeline
 * runs on an engineer's grant loses the pipeline when the engineer leaves,
 * and its spend shows against somebody who was asleep.
 *
 * **The key exists in one response and no other.** IAM stores a hash of it,
 * so no later read can return it — `create` and `rotate` carry it and
 * `list` never does. Anything rendering it must say so in the same breath,
 * because somebody who does not know stores nothing and rotates an hour
 * later.
 *
 * @module api/iam/serviceAgents
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/**
 * What a service agent may be granted.
 *
 * A subset of the OAuth scopes, and deliberately not all of them: the ones
 * about a *person* — reading their profile, acting as them — mean nothing
 * for a principal that is not one, and IAM refuses them. Offering one would
 * invite somebody to grant something that silently does nothing.
 */
export const SERVICE_AGENT_SCOPES = [
  'runtimes:read',
  'runtimes:write',
  'data:read',
  'sandboxes:manage',
] as const;

export type ServiceAgentScope = (typeof SERVICE_AGENT_SCOPES)[number];

export interface ServiceAgent {
  uid: string;
  name: string;
  description: string;
  /** The team it belongs to, where it is a team's rather than the organization's. */
  teamUid: string;
  /** Space-separated, as the token's `scope` claim carries them. */
  scopes: string;
  /**
   * Revoked rather than removed. Its audit rows name it, and a uid that
   * resolves to nothing makes a year-old row unreadable — so this is a
   * state to render, never a reason to hide the row.
   */
  revoked: boolean;
  createdBy: string;
  createdAt?: string | null;
  /** When the key was last replaced, so a listing can show a stale one. */
  keyRotatedAt?: string | null;
}

/**
 * A service agent as it comes back from a write, with the key.
 *
 * The key is present exactly twice in this API — creating and rotating —
 * and nowhere else, ever.
 */
export interface ServiceAgentWithKey extends ServiceAgent {
  key: string;
}

interface WireAgent {
  uid: string;
  name?: string | null;
  description?: string | null;
  team_uid?: string | null;
  scopes?: string | null;
  revoked?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  key_rotated_at?: string | null;
  key?: string | null;
}

const fromWire = (agent: WireAgent): ServiceAgent => ({
  uid: agent.uid,
  name: agent.name ?? '',
  description: agent.description ?? '',
  teamUid: agent.team_uid ?? '',
  scopes: agent.scopes ?? '',
  revoked: Boolean(agent.revoked),
  createdBy: agent.created_by ?? '',
  createdAt: agent.created_at ?? null,
  keyRotatedAt: agent.key_rotated_at ?? null,
});

const withKey = (agent: WireAgent): ServiceAgentWithKey => ({
  ...fromWire(agent),
  key: agent.key ?? '',
});

const agentsUrl = (baseUrl: string, orgUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/organizations/${encodeURIComponent(orgUid)}` +
  `/mcp-service-agents${suffix}`;

/**
 * One organization's service agents, revoked ones included.
 *
 * Included because hiding them makes a revoked agent invisible to whoever
 * is deciding whether it is still needed, while its audit rows still name
 * it. Any member of the organization may read this; only owners may write.
 */
export const listServiceAgents = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ServiceAgent[]> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    agents?: WireAgent[];
  }>({
    url: agentsUrl(baseUrl, orgUid),
    method: 'GET',
    token,
  });
  return (response.agents ?? []).map(fromWire);
};

/**
 * Create one. **The key is in this answer and in no other.**
 *
 * Scopes are sent as the array the caller holds; IAM joins and validates
 * them, and refuses one that is not grantable to a principal that is not a
 * person.
 */
export const createServiceAgent = async (
  token: string,
  orgUid: string,
  agent: {
    name: string;
    scopes: string[];
    description?: string;
    teamUid?: string;
  },
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ServiceAgentWithKey> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    agent?: WireAgent;
  }>({
    url: agentsUrl(baseUrl, orgUid),
    method: 'POST',
    token,
    body: {
      name: agent.name,
      scopes: agent.scopes,
      description: agent.description ?? '',
      team_uid: agent.teamUid ?? '',
    },
  });
  return withKey(response.agent ?? { uid: '' });
};

/**
 * Replace the agent's key. The old one stops working with this call.
 *
 * No grace period, which is the point of rotating: a leaked key that still
 * works for an hour is a leaked key that still works.
 */
export const rotateServiceAgentKey = async (
  token: string,
  orgUid: string,
  agentUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ServiceAgentWithKey> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    agent?: WireAgent;
  }>({
    url: agentsUrl(baseUrl, orgUid, `/${encodeURIComponent(agentUid)}/rotate`),
    method: 'POST',
    token,
  });
  return withKey(response.agent ?? { uid: agentUid });
};

/** Stop the agent, keeping it readable for its audit. */
export const revokeServiceAgent = async (
  token: string,
  orgUid: string,
  agentUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ServiceAgent> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    agent?: WireAgent;
  }>({
    url: agentsUrl(baseUrl, orgUid, `/${encodeURIComponent(agentUid)}/revoke`),
    method: 'POST',
    token,
  });
  return fromWire(response.agent ?? { uid: agentUid });
};
