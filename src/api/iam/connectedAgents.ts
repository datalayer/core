/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The agents a person has connected: the OAuth grants IAM holds for them,
 * one per client, with the scopes approved and when each was last used.
 *
 * Disconnecting revokes the grant: the refresh token stops working at once,
 * and an access token the agent still holds dies with its own expiry, which
 * is why they are short.
 *
 * @module api/iam/connectedAgents
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** A scope in the words of the consent screen. */
export interface ConnectedAgentScope {
  name: string;
  title: string;
  description: string;
}

/** How the client registered: by document URL, or the deprecated fallback. */
export type ConnectedAgentRegistration = 'cimd' | 'dcr';

export interface ConnectedAgent {
  /** The grant's uid: what **Disconnect** names. */
  uid: string;
  clientId: string;
  clientName: string;
  /**
   * The hostname of the client's document when it registered by URL — the
   * part of a client's identity that cannot be invented, and what the
   * consent screen showed. Empty for a DCR client.
   */
  clientHostname: string;
  registration: ConnectedAgentRegistration;
  scopes: string[];
  scopeDetails: ConnectedAgentScope[];
  /** The MCP resource the grant is for. */
  resource: string;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

interface ConnectedAgentsResponse {
  success: boolean;
  agents: Array<{
    uid: string;
    client_id?: string | null;
    client_name?: string | null;
    client_hostname?: string | null;
    registration?: ConnectedAgentRegistration;
    scopes?: string[];
    scope_details?: ConnectedAgentScope[];
    resource?: string;
    created_at?: string | null;
    last_used_at?: string | null;
  }>;
}

const connectedAgentsUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/oauth/connected-agents${suffix}`;

/**
 * Whether a client id is a Client ID Metadata Document URL: `https`, a host
 * and a path, no fragment. IAM answers `registration` itself; this is for a
 * client id read from somewhere else, such as an audit row or a task.
 */
export const isCimdClientId = (clientId: string): boolean =>
  /^https:\/\/[^/?#]+\/[^#]*$/.test(clientId);

export const listConnectedAgents = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ConnectedAgent[]> => {
  const response = await requestDatalayerAPI<ConnectedAgentsResponse>({
    url: connectedAgentsUrl(baseUrl),
    method: 'GET',
    token,
  });
  return (response.agents ?? []).map(agent => ({
    uid: agent.uid,
    clientId: agent.client_id ?? '',
    clientName: agent.client_name ?? agent.client_id ?? '',
    clientHostname: agent.client_hostname ?? '',
    registration: agent.registration ?? 'dcr',
    scopes: agent.scopes ?? [],
    scopeDetails: agent.scope_details ?? [],
    resource: agent.resource ?? '',
    createdAt: agent.created_at ?? null,
    lastUsedAt: agent.last_used_at ?? null,
  }));
};

/** Revoke one grant. A grant that is not the caller's is a `404`, not a revocation. */
export const disconnectAgent = async (
  token: string,
  grantUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<{ success: boolean; message?: string }> =>
  requestDatalayerAPI<{ success: boolean; message?: string }>({
    url: connectedAgentsUrl(baseUrl, `/${encodeURIComponent(grantUid)}`),
    method: 'DELETE',
    token,
  });

/**
 * Disconnect every agent this person has connected — sign out everywhere.
 *
 * **This is also how a forced re-consent is done.** A grant *is* the consent,
 * so ending them all sends the next authorization through the consent screen
 * rather than letting it be answered from what was agreed before; there is no
 * separate "ask again" flag to keep in step with this one.
 *
 * Always the caller's own. A person cannot end somebody else's sessions here
 * — an organization taking back what it granted is deprovisioning, which runs
 * when a membership ends.
 */
export const disconnectEveryAgent = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<{ success: boolean; revoked: number; message?: string }> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    revoked?: number;
    message?: string;
  }>({
    url: connectedAgentsUrl(baseUrl),
    method: 'DELETE',
    token,
  });
  return { ...response, revoked: response.revoked ?? 0 };
};

/**
 * Disconnect every agent connected while acting for one team.
 *
 * For the people who may manage that team: ending a team's sessions is the
 * same kind of authority as removing somebody from it. It never touches a
 * personal agent or another team's — the same narrowness deprovisioning has.
 */
export const disconnectEveryAgentInTeam = async (
  token: string,
  teamUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<{ success: boolean; revoked: number; message?: string }> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    revoked?: number;
    message?: string;
  }>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/oauth/teams/${encodeURIComponent(teamUid)}/connected-agents`,
    method: 'DELETE',
    token,
  });
  return { ...response, revoked: response.revoked ?? 0 };
};
