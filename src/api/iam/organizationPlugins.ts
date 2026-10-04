/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The plugins an organization has turned off (LOOP C-12).
 *
 * One list of plugin ids of the catalogue (`agentspecs/ui-plugins`), kept by
 * IAM on the organization. A member reads it; an owner replaces it. IAM checks
 * an id's shape only: what an id means is the reader's — the Studio's Canvas
 * leaves a plugin's blocks off its palette, and the checks of an application
 * say which of its blocks are off.
 *
 * @module api/iam/organizationPlugins
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

const pluginsOffUrl = (baseUrl: string, orgUid: string): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/organizations/${encodeURIComponent(orgUid)}/plugins-off`;

/** The plugin ids the organization has turned off; none when it has decided nothing. */
export const getOrganizationPluginsOff = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<string[]> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    plugins_off: string[];
  }>({
    url: pluginsOffUrl(baseUrl, orgUid),
    method: 'GET',
    token,
  });
  return response.plugins_off;
};

/**
 * Replace the list: the plugins named are off, every other is on. An owner's,
 * or a platform administrator's; IAM answers `422` with the reason for an id
 * that is not one.
 */
export const setOrganizationPluginsOff = async (
  token: string,
  orgUid: string,
  pluginsOff: readonly string[],
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<string[]> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    plugins_off: string[];
  }>({
    url: pluginsOffUrl(baseUrl, orgUid),
    method: 'PUT',
    token,
    body: { plugins_off: [...pluginsOff] },
  });
  return response.plugins_off;
};
