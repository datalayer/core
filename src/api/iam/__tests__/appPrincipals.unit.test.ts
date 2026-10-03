/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Application principals (LOOP I-02): a deployed application as a principal
 * of its own, which a person may own as an organization may. As for service
 * agents, the key is in a write's answer and in no read's.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  createAppPrincipal,
  listAppPrincipals,
  revokeAppPrincipal,
  rotateAppPrincipalKey,
} from '../appPrincipals';

const IAM = 'https://iam.test';

describe('application principals API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads a person’s principals, of one application, with no key', async () => {
    const call = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        principals: [
          {
            uid: '01AP',
            name: 'Web Research',
            kind: 'app',
            app_uid: 'app-1',
            account_uid: '01USER',
            scopes: 'runtimes:read runtimes:write',
            revoked: false,
          },
        ],
      } as never);
    const [principal] = await listAppPrincipals(
      'token',
      { appUid: 'app-1' },
      IAM,
    );
    expect(call.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/app-principals?app_uid=app-1`,
    );
    expect(principal).toMatchObject({
      uid: '01AP',
      appUid: 'app-1',
      accountUid: '01USER',
      orgUid: '',
    });
    expect('key' in principal).toBe(false);
  });

  it('answers the key on a write, and names an organization’s with its uid', async () => {
    const call = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({
        success: true,
        principal: {
          uid: '01AP',
          app_uid: 'app-1',
          account_uid: '01ORG',
          org_uid: '01ORG',
          key: 'dla_sa_x',
        },
      } as never);
    const made = await createAppPrincipal(
      'token',
      {
        appUid: 'app-1',
        name: 'Desk',
        scopes: ['runtimes:read'],
        orgUid: '01ORG',
      },
      IAM,
    );
    expect(call.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/app-principals?org_uid=01ORG`,
    );
    expect(call.mock.calls[0][0].body).toMatchObject({
      app_uid: 'app-1',
      scopes: ['runtimes:read'],
    });
    expect(made.key).toBe('dla_sa_x');
    const rotated = await rotateAppPrincipalKey(
      'token',
      '01AP',
      undefined,
      IAM,
    );
    expect(call.mock.calls[1][0].url).toBe(
      `${IAM}/api/iam/v1/app-principals/01AP/rotate`,
    );
    expect(rotated.key).toBe('dla_sa_x');
    await revokeAppPrincipal('token', '01AP', '01ORG', IAM);
    expect(call.mock.calls[2][0].url).toBe(
      `${IAM}/api/iam/v1/app-principals/01AP/revoke?org_uid=01ORG`,
    );
  });
});
