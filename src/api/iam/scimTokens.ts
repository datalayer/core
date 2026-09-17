/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The credentials an organization's directory provisions with, over SCIM.
 *
 * The identity provider registry beside this one made a directory able to
 * *sign somebody in*. SCIM is the half that does not wait for them to turn
 * up: the directory says who exists when they join and, far more
 * importantly, who has left.
 *
 * **The token is the tenant.** Every SCIM call resolves its organization
 * from the bearer credential before it looks at anything else, so these
 * records are not a convenience — each one *is* an organization's provisioning
 * authority, and there is nothing else identifying the caller.
 *
 * **The secret is answered once and never again.** `createScimToken` and
 * `rotateScimToken` return it; nothing reads it back, because only a SHA-256
 * of it is stored. A console that offered to show it later would be
 * promising something the server cannot do — so this client has no call that
 * could, and the UI has to say "copy it now" and mean it.
 *
 * `lastUsedAt` is the column worth reading. A directory configured once and
 * forgotten looks exactly like a live one in every other field, and the
 * difference matters most for deprovisioning: the integration that has not
 * called in a month is not removing anybody.
 *
 * @module api/iam/scimTokens
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** A SCIM credential as the console may see it — never the secret or its hash. */
export interface ScimToken {
  uid: string;
  orgUid: string;
  /** What an administrator called it, to tell two directories apart. */
  name: string;
  /**
   * Revoked rather than deleted, so the rows a provisioning run wrote can
   * still name the token that wrote them.
   */
  revoked: boolean;
  /**
   * When the secret was last replaced. A token that has never been rotated
   * carries its creation moment here.
   */
  rotatedAt?: string;
  /**
   * When it last authenticated a SCIM call, or empty for never. Written best
   * effort — a provisioning call is never failed for the bookkeeping.
   */
  lastUsedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A freshly minted credential: the record, and the secret **this once**.
 *
 * The two are separate fields rather than one merged object on purpose. The
 * secret does not belong in anything the console stores, renders twice, or
 * puts in a list, and a shape that carried it alongside every other field
 * invites exactly that.
 */
export interface MintedScimToken {
  token: ScimToken;
  /** Shown once. Not retrievable, by construction — only a hash is stored. */
  secret: string;
}

interface WireScimToken {
  uid?: string;
  org_uid?: string;
  name?: string;
  revoked?: boolean;
  rotated_at?: string;
  last_used_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  /** Present only on a create or rotate, and only in that one answer. */
  token?: string;
}

const fromWire = (wire: WireScimToken): ScimToken => ({
  uid: wire.uid ?? '',
  orgUid: wire.org_uid ?? '',
  name: wire.name ?? '',
  // A record with no `revoked` field is a live one: absence is not
  // revocation, and reading it as one would show every token as stopped.
  revoked: wire.revoked === true,
  rotatedAt: wire.rotated_at || undefined,
  lastUsedAt: wire.last_used_at || undefined,
  createdBy: wire.created_by || undefined,
  createdAt: wire.created_at || undefined,
  updatedAt: wire.updated_at || undefined,
});

const tokensUrl = (baseUrl: string, orgUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/organizations/${encodeURIComponent(orgUid)}` +
  `/scim-tokens${suffix}`;

export const listScimTokens = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ScimToken[]> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    tokens?: WireScimToken[];
  }>({
    url: tokensUrl(baseUrl, orgUid),
    method: 'GET',
    token,
  });
  return (response.tokens ?? []).map(fromWire);
};

/**
 * Mint one. The secret is in this answer and nowhere else, ever again.
 *
 * The caller must put it in front of somebody before the next render. There
 * is no second chance and no call that would provide one.
 */
export const createScimToken = async (
  token: string,
  orgUid: string,
  name: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<MintedScimToken> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    token?: WireScimToken;
  }>({
    url: tokensUrl(baseUrl, orgUid),
    method: 'POST',
    token,
    body: { name },
  });
  return {
    token: fromWire(response.token ?? {}),
    secret: response.token?.token ?? '',
  };
};

/**
 * A new secret for the same record; the old one stops at once.
 *
 * Rotation rather than delete-and-recreate because the record's uid is what
 * the provisioning rows name. Replacing it would leave them pointing at
 * nothing.
 */
export const rotateScimToken = async (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<MintedScimToken> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    token?: WireScimToken;
  }>({
    url: tokensUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}/rotate`),
    method: 'POST',
    token,
  });
  return {
    token: fromWire(response.token ?? {}),
    secret: response.token?.token ?? '',
  };
};

/** Stop a token, keeping the rows that name it readable. */
export const revokeScimToken = async (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<ScimToken> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    token?: WireScimToken;
  }>({
    url: tokensUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}`),
    method: 'DELETE',
    token,
  });
  return fromWire(response.token ?? {});
};

/**
 * The base URL a directory is configured with.
 *
 * Built here rather than typed into the page, because it is half of what an
 * administrator copies into Okta or Entra and a typo in it looks like an
 * outage on the directory's side. The directory appends `/Users` itself;
 * RFC 7644 fixes everything after this.
 */
export const scimBaseUrl = (
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): string => `${baseUrl}/api/iam/scim/v2`;

/**
 * Whether this organization can actually be provisioned into right now.
 *
 * A list with tokens in it is not the same as a working integration, and the
 * distinction is the one an administrator most needs: every token revoked
 * reads, in a table, almost exactly like a healthy setup. `neverUsed` is the
 * other quiet state — configured, live, and never once called, which is what
 * a directory that was set up and never switched on looks like.
 */
export const scimStatus = (
  tokens: ScimToken[],
): {
  state: 'none' | 'revoked' | 'never-used' | 'active';
  live: ScimToken[];
  lastUsedAt?: string;
} => {
  const live = tokens.filter(entry => !entry.revoked);
  if (tokens.length === 0) {
    return { state: 'none', live };
  }
  if (live.length === 0) {
    return { state: 'revoked', live };
  }
  const used = live
    .map(entry => entry.lastUsedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const lastUsedAt = used.length > 0 ? used[used.length - 1] : undefined;
  return {
    state: lastUsedAt ? 'active' : 'never-used',
    live,
    lastUsedAt,
  };
};
