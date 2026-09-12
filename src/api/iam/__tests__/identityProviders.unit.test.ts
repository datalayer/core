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
 * The property this file protects: a **claim is not proof**. The wire keeps
 * `domains` and `verifiedDomains` distinct all the way through this client,
 * so a form cannot collapse the two into "the domains" and show a claimed
 * one as though it already routed sign-in.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  createIdentityProvider,
  deleteIdentityProvider,
  disableIdentityProvider,
  enableIdentityProvider,
  getDomainVerification,
  getIdentityProvider,
  IdentityProviderInvalid,
  listIdentityProviders,
  updateIdentityProvider,
  verifyDomain,
  type IdentityProviderDraft,
} from '../identityProviders';

const IAM = 'https://iam.test';
const ORG = '01ORG';

const DRAFT: IdentityProviderDraft = {
  name: 'Acme Okta',
  protocol: 'oidc',
  issuer: 'https://acme.okta.com',
  clientId: '0oa1234',
  clientSecretRef: '',
  domains: ['acme.com'],
  groupClaim: 'groups',
  allowEmailLinking: false,
  roleMappings: [],
  enabled: true,
};

const httpError = (status: number, message = 'refused'): Error => {
  const error = new Error(message) as Error & { response: { status: number } };
  error.response = { status };
  return error;
};

describe('identity providers', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads an organization’s providers, disabled ones included', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      providers: [
        {
          uid: '01P',
          org_uid: ORG,
          name: 'Acme Okta',
          issuer: 'https://acme.okta.com',
          client_id: '0oa1234',
          domains: ['acme.com'],
          verified_domains: [],
          enabled: false,
          version: 2,
        },
      ],
    } as never);

    const [provider] = await listIdentityProviders('token', ORG, IAM);

    expect(provider.issuer).toBe('https://acme.okta.com');
    // Disabled is a state to render, not a reason to hide: an administrator
    // has to be able to see the provider they turned off, or turn it on.
    expect(provider.enabled).toBe(false);
  });

  it('keeps a claimed domain and a verified one apart', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      providers: [
        {
          uid: '01P',
          domains: ['acme.com', 'acme.io'],
          verified_domains: ['acme.com'],
        },
      ],
    } as never);

    const [provider] = await listIdentityProviders('token', ORG, IAM);

    expect(provider.domains).toEqual(['acme.com', 'acme.io']);
    expect(provider.verifiedDomains).toEqual(['acme.com']);
  });

  it('sends the wire names the service stores', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, provider: { uid: '01P' } } as never);

    await createIdentityProvider('token', ORG, DRAFT, IAM);

    expect(request.mock.calls[0][0].body).toEqual({
      name: 'Acme Okta',
      protocol: 'oidc',
      issuer: 'https://acme.okta.com',
      client_id: '0oa1234',
      client_secret_ref: '',
      domains: ['acme.com'],
      group_claim: 'groups',
      allow_email_linking: false,
      role_mappings: [],
      enabled: true,
    });
    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/identity-providers`,
    );
  });

  it('round-trips a role mapping, team roles included', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        provider: {
          uid: '01P',
          role_mappings: [
            { group: 'admins', role: 'organization_owner', team_uid: '' },
            { group: 'eng', role: 'team_member', team_uid: '01TEAM' },
          ],
        },
      } as never);

    await createIdentityProvider(
      'token',
      ORG,
      {
        ...DRAFT,
        roleMappings: [
          { group: 'admins', role: 'organization_owner', teamUid: '' },
          { group: 'eng', role: 'team_member', teamUid: '01TEAM' },
        ],
      },
      IAM,
    );
    expect(request.mock.calls[0][0].body).toMatchObject({
      role_mappings: [
        { group: 'admins', role: 'organization_owner', team_uid: '' },
        { group: 'eng', role: 'team_member', team_uid: '01TEAM' },
      ],
    });

    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValueOnce({
      success: true,
      providers: [
        {
          uid: '01P',
          role_mappings: [
            { group: 'admins', role: 'organization_owner', team_uid: '' },
            { group: 'eng', role: 'team_member', team_uid: '01TEAM' },
          ],
        },
      ],
    } as never);
    const [provider] = await listIdentityProviders('token', ORG, IAM);
    expect(provider.roleMappings).toEqual([
      { group: 'admins', role: 'organization_owner', teamUid: '' },
      { group: 'eng', role: 'team_member', teamUid: '01TEAM' },
    ]);
  });

  it('turns a registry refusal into IdentityProviderInvalid', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(400, "the 'issuer' must be an https:// URL"),
    );

    await expect(
      createIdentityProvider('token', ORG, DRAFT, IAM),
    ).rejects.toThrow(IdentityProviderInvalid);
    await expect(
      createIdentityProvider('token', ORG, DRAFT, IAM),
    ).rejects.toThrow(/https/);
  });

  it('leaves an unrelated failure as it was', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(500),
    );

    await expect(
      createIdentityProvider('token', ORG, DRAFT, IAM),
    ).rejects.not.toThrow(IdentityProviderInvalid);
  });

  it('reads one provider by uid', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      provider: { uid: '01P', name: 'Acme Okta' },
    } as never);

    const provider = await getIdentityProvider('token', ORG, '01P', IAM);
    expect(provider.name).toBe('Acme Okta');
  });

  it('updates a provider at its own route', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, provider: { uid: '01P' } } as never);

    await updateIdentityProvider('token', ORG, '01P', DRAFT, IAM);

    expect(request.mock.calls[0][0].method).toBe('PUT');
    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/identity-providers/01P`,
    );
  });

  it('enables and disables without sending a body', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        provider: { uid: '01P', enabled: false },
      } as never);

    await disableIdentityProvider('token', ORG, '01P', IAM);
    expect(request.mock.calls[0][0].url).toContain('/01P/disable');
    expect(request.mock.calls[0][0].body).toBeUndefined();

    await enableIdentityProvider('token', ORG, '01P', IAM);
    expect(request.mock.calls[1][0].url).toContain('/01P/enable');
  });

  it('deletes a provider outright', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true } as never);

    await deleteIdentityProvider('token', ORG, '01P', IAM);

    expect(request.mock.calls[0][0].method).toBe('DELETE');
    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/identity-providers/01P`,
    );
  });

  it('reads what to publish in DNS, and whether it is proved yet', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      verification: {
        host: '_datalayer-verification.acme.com',
        type: 'TXT',
        value: 'datalayer-domain-verification=dlv_01ABC',
      },
      verified: false,
    } as never);

    const { verification, verified } = await getDomainVerification(
      'token',
      ORG,
      '01P',
      'acme.com',
      IAM,
    );

    expect(verification.host).toBe('_datalayer-verification.acme.com');
    expect(verified).toBe(false);
  });

  it('verifies a domain at its own route', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        provider: { uid: '01P', verified_domains: ['acme.com'] },
      } as never);

    const provider = await verifyDomain('token', ORG, '01P', 'acme.com', IAM);

    expect(request.mock.calls[0][0].method).toBe('POST');
    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/identity-providers/01P/domains/acme.com/verify`,
    );
    expect(provider.verifiedDomains).toEqual(['acme.com']);
  });

  it('turns a failed verification into IdentityProviderInvalid', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockRejectedValue(
      httpError(400, 'no TXT record was found'),
    );

    await expect(
      verifyDomain('token', ORG, '01P', 'acme.com', IAM),
    ).rejects.toThrow(IdentityProviderInvalid);
  });

  it('encodes a domain with special characters in the URL', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, provider: { uid: '01P' } } as never);

    await getDomainVerification('token', ORG, '01P', 'a b.com', IAM);
    expect(request.mock.calls[0][0].url).toContain('a%20b.com');
  });
});
