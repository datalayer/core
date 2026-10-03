/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Application principals: a deployed LOOP application as a principal of its
 * own (plans/LOOP.md, I-02).
 *
 * The service agents' kin — a key that is exchanged for an hour's token, an
 * audit that names it — with two differences: a person may own one, not only
 * an organization, and it is the principal of one application. Its token says
 * whose it is (`account_uid`) and which application (`app_uid`). ai-agents
 * makes one at the application's first deploy; these calls are for reading,
 * rotating and revoking it.
 *
 * @module api/iam/appPrincipals
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import type { ServiceAgent } from './serviceAgents';

export interface AppPrincipal extends ServiceAgent {
  /** The application it is the principal of. */
  appUid: string;
  /** Whose it is: a person's uid, or an organization's. */
  accountUid: string;
  /** The organization, when an organization owns it; empty for a person's. */
  orgUid: string;
}

/** A principal as it comes back from a write, with the key — that once. */
export interface AppPrincipalWithKey extends AppPrincipal {
  key: string;
}

interface WirePrincipal {
  uid: string;
  name?: string | null;
  description?: string | null;
  team_uid?: string | null;
  scopes?: string | null;
  revoked?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  key_rotated_at?: string | null;
  app_uid?: string | null;
  account_uid?: string | null;
  org_uid?: string | null;
  key?: string | null;
}

const fromWire = (principal: WirePrincipal): AppPrincipal => ({
  uid: principal.uid,
  name: principal.name ?? '',
  description: principal.description ?? '',
  teamUid: principal.team_uid ?? '',
  scopes: principal.scopes ?? '',
  revoked: Boolean(principal.revoked),
  createdBy: principal.created_by ?? '',
  createdAt: principal.created_at ?? null,
  keyRotatedAt: principal.key_rotated_at ?? null,
  appUid: principal.app_uid ?? '',
  accountUid: principal.account_uid ?? '',
  orgUid: principal.org_uid ?? '',
});

const withKey = (principal: WirePrincipal): AppPrincipalWithKey => ({
  ...fromWire(principal),
  key: principal.key ?? '',
});

const principalsUrl = (baseUrl: string, suffix = '', orgUid?: string): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/app-principals${suffix}` +
  (orgUid ? `?org_uid=${encodeURIComponent(orgUid)}` : '');

/** The caller's application principals — or an organization's, for its owners. */
export const listAppPrincipals = async (
  token: string,
  options: { appUid?: string; orgUid?: string } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<AppPrincipal[]> => {
  const query = new URLSearchParams();
  if (options.appUid) query.set('app_uid', options.appUid);
  if (options.orgUid) query.set('org_uid', options.orgUid);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await requestDatalayerAPI<{
    success: boolean;
    principals?: WirePrincipal[];
  }>({
    url: `${baseUrl}${API_BASE_PATHS.IAM}/app-principals${suffix}`,
    method: 'GET',
    token,
  });
  return (response.principals ?? []).map(fromWire);
};

/** Make one. **The key is in this answer and in no other.** */
export const createAppPrincipal = async (
  token: string,
  principal: {
    appUid: string;
    name: string;
    scopes: string[];
    description?: string;
    orgUid?: string;
  },
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<AppPrincipalWithKey> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    principal?: WirePrincipal;
  }>({
    url: principalsUrl(baseUrl, '', principal.orgUid),
    method: 'POST',
    token,
    body: {
      app_uid: principal.appUid,
      name: principal.name,
      scopes: principal.scopes,
      description: principal.description ?? '',
    },
  });
  return withKey(response.principal ?? { uid: '' });
};

/** Replace its key. The old one stops working with this call. */
export const rotateAppPrincipalKey = async (
  token: string,
  uid: string,
  orgUid?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<AppPrincipalWithKey> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    principal?: WirePrincipal;
  }>({
    url: principalsUrl(baseUrl, `/${encodeURIComponent(uid)}/rotate`, orgUid),
    method: 'POST',
    token,
  });
  return withKey(response.principal ?? { uid });
};

/** Stop it, keeping it readable for its audit. */
export const revokeAppPrincipal = async (
  token: string,
  uid: string,
  orgUid?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<AppPrincipal> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    principal?: WirePrincipal;
  }>({
    url: principalsUrl(baseUrl, `/${encodeURIComponent(uid)}/revoke`, orgUid),
    method: 'POST',
    token,
  });
  return fromWire(response.principal ?? { uid });
};
