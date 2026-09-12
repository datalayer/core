/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An organization's own identity provider.
 *
 * Enterprise sign-in used to be one Okta for the whole deployment. This is
 * the registry that replaces it: an organization registers an OIDC provider
 * — issuer, client id, the email domains it claims — and a sign-in is routed
 * to it by domain.
 *
 * **A claim is not proof.** Registering a domain here does not route
 * anything: only a domain proved by a DNS TXT record does, because a domain
 * that only had to be typed would let one organization receive another's
 * sign-ins. `getDomainVerification` reads what to publish; `verifyDomain`
 * checks it and is the only call that turns a claim into a route.
 *
 * **The client secret never appears here.** The record names a secret in the
 * organization's own secret store (`clientSecretRef`); this client never
 * reads or writes a secret's value.
 *
 * @module api/iam/identityProviders
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** A role a group mapping may grant, at the organization or at a team. */
export const ORGANIZATION_ROLES = [
  'organization_owner',
  'organization_security_auditor',
  'organization_user_reviewer',
  'organization_member',
] as const;

export const TEAM_ROLES = ['team_owner', 'team_member'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
export type TeamRole = (typeof TEAM_ROLES)[number];

/** One `groups` claim mapped onto one role, at the organization or a team. */
export interface RoleMapping {
  /** The group, exactly as the token names it. */
  group: string;
  role: OrganizationRole | TeamRole;
  /** Which team, when `role` is a team role; empty for an organization role. */
  teamUid: string;
}

export interface IdentityProvider {
  uid: string;
  orgUid: string;
  name: string;
  protocol: 'oidc';
  issuer: string;
  clientId: string;
  /** The *name* of a secret in this organization's store — never the secret. */
  clientSecretRef: string;
  /** Domains this provider claims. Claiming is free; see `verifiedDomains`. */
  domains: string[];
  /** The claimed domains proved by DNS. Only these route a sign-in. */
  verifiedDomains: string[];
  groupClaim: string;
  /** Whether a sign-in may adopt a Datalayer account that already exists
   * with the asserted address, rather than being refused. Off by default:
   * see the module and provisioning notes for why. */
  allowEmailLinking: boolean;
  roleMappings: RoleMapping[];
  enabled: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

/**
 * A provider as it is written. Everything but what the route already names
 * and `verifiedDomains` — which is never sent, only ever read: it is set
 * exclusively by `verifyDomain` checking DNS, and a draft that could set it
 * directly would be a way to claim verification without proving anything.
 */
export type IdentityProviderDraft = Omit<
  IdentityProvider,
  | 'uid'
  | 'orgUid'
  | 'verifiedDomains'
  | 'createdBy'
  | 'createdAt'
  | 'updatedAt'
  | 'version'
>;

export interface DomainVerification {
  host: string;
  type: 'TXT';
  value: string;
}

interface WireRoleMapping {
  group?: string | null;
  role?: string | null;
  team_uid?: string | null;
}

interface WireProvider {
  uid: string;
  org_uid?: string | null;
  name?: string | null;
  protocol?: string | null;
  issuer?: string | null;
  client_id?: string | null;
  client_secret_ref?: string | null;
  domains?: string[] | null;
  verified_domains?: string[] | null;
  group_claim?: string | null;
  allow_email_linking?: boolean | null;
  role_mappings?: WireRoleMapping[] | null;
  enabled?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: number | null;
}

const roleMappingFromWire = (mapping: WireRoleMapping): RoleMapping => ({
  group: mapping.group ?? '',
  role: (mapping.role as OrganizationRole | TeamRole) ?? 'organization_member',
  teamUid: mapping.team_uid ?? '',
});

const roleMappingToWire = (mapping: RoleMapping): WireRoleMapping => ({
  group: mapping.group,
  role: mapping.role,
  team_uid: mapping.teamUid,
});

const fromWire = (provider: WireProvider): IdentityProvider => ({
  uid: provider.uid,
  orgUid: provider.org_uid ?? '',
  name: provider.name ?? '',
  protocol: 'oidc',
  issuer: provider.issuer ?? '',
  clientId: provider.client_id ?? '',
  clientSecretRef: provider.client_secret_ref ?? '',
  domains: provider.domains ?? [],
  verifiedDomains: provider.verified_domains ?? [],
  groupClaim: provider.group_claim ?? 'groups',
  allowEmailLinking: provider.allow_email_linking ?? false,
  roleMappings: (provider.role_mappings ?? []).map(roleMappingFromWire),
  enabled: provider.enabled ?? true,
  createdBy: provider.created_by ?? undefined,
  createdAt: provider.created_at ?? undefined,
  updatedAt: provider.updated_at ?? undefined,
  version: provider.version ?? undefined,
});

const toWire = (provider: IdentityProviderDraft): Record<string, unknown> => ({
  name: provider.name,
  protocol: provider.protocol,
  issuer: provider.issuer,
  client_id: provider.clientId,
  client_secret_ref: provider.clientSecretRef,
  domains: provider.domains,
  group_claim: provider.groupClaim,
  allow_email_linking: provider.allowEmailLinking,
  role_mappings: provider.roleMappings.map(roleMappingToWire),
  enabled: provider.enabled,
});

/** Raised when the registry refused a provider as written — a bad issuer, an
 * unowned domain, an unknown role in a mapping. The message is IAM's own. */
export class IdentityProviderInvalid extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityProviderInvalid';
  }
}

const providersUrl = (baseUrl: string, orgUid: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/organizations/${encodeURIComponent(orgUid)}/identity-providers${suffix}`;

export const listIdentityProviders = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider[]> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    providers?: WireProvider[];
  }>({
    url: providersUrl(baseUrl, orgUid),
    method: 'GET',
    token,
  });
  return (response.providers ?? []).map(fromWire);
};

export const getIdentityProvider = async (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    provider?: WireProvider;
  }>({
    url: providersUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}`),
    method: 'GET',
    token,
  });
  return fromWire(response.provider ?? { uid });
};

export const createIdentityProvider = async (
  token: string,
  orgUid: string,
  provider: IdentityProviderDraft,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider> => {
  const response = await withRefusal(() =>
    requestDatalayerAPI<{ success: boolean; provider?: WireProvider }>({
      url: providersUrl(baseUrl, orgUid),
      method: 'POST',
      token,
      body: toWire(provider),
    }),
  );
  return fromWire(response.provider ?? { uid: '' });
};

export const updateIdentityProvider = async (
  token: string,
  orgUid: string,
  uid: string,
  provider: IdentityProviderDraft,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider> => {
  const response = await withRefusal(() =>
    requestDatalayerAPI<{ success: boolean; provider?: WireProvider }>({
      url: providersUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}`),
      method: 'PUT',
      token,
      body: toWire(provider),
    }),
  );
  return fromWire(response.provider ?? { uid });
};

const setEnabled = async (
  token: string,
  orgUid: string,
  uid: string,
  enabled: boolean,
  baseUrl: string,
): Promise<IdentityProvider> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    provider?: WireProvider;
  }>({
    url: providersUrl(
      baseUrl,
      orgUid,
      `/${encodeURIComponent(uid)}/${enabled ? 'enable' : 'disable'}`,
    ),
    method: 'POST',
    token,
  });
  return fromWire(response.provider ?? { uid });
};

export const enableIdentityProvider = (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider> => setEnabled(token, orgUid, uid, true, baseUrl);

export const disableIdentityProvider = (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider> => setEnabled(token, orgUid, uid, false, baseUrl);

/** Remove a registration outright. Prefer disabling one that has been used:
 * this keeps no trace for the sign-in rows that name it. */
export const deleteIdentityProvider = async (
  token: string,
  orgUid: string,
  uid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  await requestDatalayerAPI({
    url: providersUrl(baseUrl, orgUid, `/${encodeURIComponent(uid)}`),
    method: 'DELETE',
    token,
  });
};

/** What to publish in DNS to prove this organization holds `domain`. */
export const getDomainVerification = async (
  token: string,
  orgUid: string,
  uid: string,
  domain: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<{ verification: DomainVerification; verified: boolean }> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    verification?: DomainVerification;
    verified?: boolean;
  }>({
    url: providersUrl(
      baseUrl,
      orgUid,
      `/${encodeURIComponent(uid)}/domains/${encodeURIComponent(domain)}/verification`,
    ),
    method: 'GET',
    token,
  });
  return {
    verification: response.verification ?? { host: '', type: 'TXT', value: '' },
    verified: response.verified ?? false,
  };
};

/**
 * Check DNS now and, if the record is there, make the domain route sign-in.
 *
 * Until this succeeds the domain routes nothing at all, whatever was typed
 * when the provider was registered.
 */
export const verifyDomain = async (
  token: string,
  orgUid: string,
  uid: string,
  domain: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IdentityProvider> => {
  const response = await withRefusal(() =>
    requestDatalayerAPI<{ success: boolean; provider?: WireProvider }>({
      url: providersUrl(
        baseUrl,
        orgUid,
        `/${encodeURIComponent(uid)}/domains/${encodeURIComponent(domain)}/verify`,
      ),
      method: 'POST',
      token,
    }),
  );
  return fromWire(response.provider ?? { uid });
};

/**
 * Turn IAM's `400` into one the form can show beside the field.
 *
 * A `400` here is never a bug in the client: it is the registry saying it
 * refused what was written, and its message names why — an `http` issuer, a
 * domain somebody else already verified, an unknown role in a mapping.
 */
const withRefusal = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    const candidate = error as {
      status?: number;
      response?: { status?: number };
      message?: string;
    };
    const status = candidate?.status ?? candidate?.response?.status;
    if (status === 400) {
      throw new IdentityProviderInvalid(
        candidate.message || 'This identity provider was refused.',
      );
    }
    throw error;
  }
};
