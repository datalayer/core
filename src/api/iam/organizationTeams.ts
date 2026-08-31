/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The teams inside one organization.
 *
 * Only what the MCP console needs of them: a name to show and a uid to
 * address a policy layer with. Team membership, invitations and the rest
 * belong to the organization's own settings, not here.
 *
 * @module api/iam/organizationTeams
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

export interface OrganizationTeam {
  uid: string;
  handle: string;
  name: string;
}

interface WireTeam {
  uid?: string | null;
  handle_s?: string | null;
  name_t?: string | null;
}

/**
 * One organization's teams.
 *
 * A team with no uid is dropped rather than rendered: it addresses no
 * policy layer, so a row for it would offer a form whose every write is a
 * `404`.
 */
export const listOrganizationTeams = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<OrganizationTeam[]> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    teams?: WireTeam[];
  }>({
    url:
      `${baseUrl}${API_BASE_PATHS.IAM}/organizations/` +
      `${encodeURIComponent(orgUid)}/teams`,
    method: 'GET',
    token,
  });
  return (response.teams ?? [])
    .filter(team => Boolean(team.uid))
    .map(team => ({
      uid: team.uid as string,
      handle: team.handle_s ?? '',
      // The handle is the fallback rather than the uid: a person picking a
      // team from a list knows `data-science`, not `01ARZ3ND…`.
      name: team.name_t || team.handle_s || (team.uid as string),
    }));
};
