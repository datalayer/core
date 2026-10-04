/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  getOrganizationPluginsOff,
  setOrganizationPluginsOff,
} from '../organizationPlugins';

const IAM = 'https://iam.test';
const ORG = '01ORG';

describe('the plugins an organization has turned off', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads them under the organization', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, plugins_off: ['a2ui'] } as never);

    expect(await getOrganizationPluginsOff('token', ORG, IAM)).toEqual([
      'a2ui',
    ]);
    expect(request.mock.calls[0][0]).toMatchObject({
      url: `${IAM}/api/iam/v1/organizations/${ORG}/plugins-off`,
      method: 'GET',
      token: 'token',
    });
  });

  it('replaces the whole list', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, plugins_off: [] } as never);

    expect(await setOrganizationPluginsOff('token', ORG, [], IAM)).toEqual([]);
    expect(request.mock.calls[0][0]).toMatchObject({
      url: `${IAM}/api/iam/v1/organizations/${ORG}/plugins-off`,
      method: 'PUT',
      body: { plugins_off: [] },
    });
  });
});
