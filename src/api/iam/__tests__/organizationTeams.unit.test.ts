/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { listOrganizationTeams } from '../organizationTeams';

const IAM = 'https://iam.test';
const ORG = '01ORG';

describe("an organization's teams", () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads them under the organization', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, teams: [] } as never);

    await listOrganizationTeams('token', ORG, IAM);

    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/teams`,
    );
  });

  it('names a team by its name', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      teams: [{ uid: '01T', handle_s: 'data-science', name_t: 'Data Science' }],
    } as never);

    expect((await listOrganizationTeams('token', ORG, IAM))[0].name).toBe(
      'Data Science',
    );
  });

  it('falls back to the handle, not the uid', async () => {
    // Somebody picking a team from a list knows `data-science`, not
    // `01ARZ3ND…`.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      teams: [{ uid: '01T', handle_s: 'data-science' }],
    } as never);

    expect((await listOrganizationTeams('token', ORG, IAM))[0].name).toBe(
      'data-science',
    );
  });

  it('drops a team with no uid rather than rendering it', async () => {
    // It addresses no policy layer, so a row for it would offer a form whose
    // every write is a 404.
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      teams: [{ handle_s: 'ghost' }, { uid: '01T', name_t: 'Real' }],
    } as never);

    const teams = await listOrganizationTeams('token', ORG, IAM);
    expect(teams.map(team => team.name)).toEqual(['Real']);
  });

  it('answers an empty list for an organization with no teams', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
    } as never);

    expect(await listOrganizationTeams('token', ORG, IAM)).toEqual([]);
  });
});
