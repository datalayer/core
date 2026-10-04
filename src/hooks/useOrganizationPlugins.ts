/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The plugins an organization has turned off (LOOP C-12), read and replaced
 * through IAM with the signed-in person's token.
 *
 * @module hooks/useOrganizationPlugins
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrganizationPluginsOff,
  setOrganizationPluginsOff,
} from '../api/iam/organizationPlugins';
import { useCoreStore, useIAMStore } from '../state';
import { queryKeys } from './useCache';

/** The plugin ids the organization has turned off; no query without an organization. */
export const useOrganizationPluginsOff = (orgUid: string) => {
  const token = useIAMStore(state => state.token);
  const iamUrl = useCoreStore(state => state.configuration.iamUrl);
  return useQuery<string[]>({
    queryKey: queryKeys.organizations.pluginsOff(orgUid),
    queryFn: () => getOrganizationPluginsOff(token ?? '', orgUid, iamUrl),
    enabled: Boolean(token && iamUrl && orgUid),
    staleTime: 30_000,
  });
};

/** Replace the list: the plugins named are off, every other is on. */
export const useSetOrganizationPluginsOff = (orgUid: string) => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const iamUrl = useCoreStore(state => state.configuration.iamUrl);
  return useMutation<string[], Error, readonly string[]>({
    mutationFn: pluginsOff =>
      setOrganizationPluginsOff(token ?? '', orgUid, pluginsOff, iamUrl),
    onSuccess: pluginsOff => {
      queryClient.setQueryData(
        queryKeys.organizations.pluginsOff(orgUid),
        pluginsOff,
      );
    },
  });
};
