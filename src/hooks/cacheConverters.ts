/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Local response converters for the core cache hook.
 *
 * The rich content models (Space, Page, CodeSandboxSnapshot) live in the
 * runtime/content package (`@datalayer/agent-runtimes`). The core cache still
 * fetches this data over raw HTTP, so these converters are kept here with
 * loosened (structural) types to preserve runtime behaviour without depending
 * on the content models.
 *
 * @module hooks/cacheConverters
 */

import { asUser } from '../models';
import { asArray } from '../utils';

/**
 * Convert a raw code sandbox snapshot payload into its client shape.
 *
 * @param s - The raw snapshot payload from the API.
 * @returns The converted snapshot object.
 */
export function asCodeSandboxSnapshot(s: any): any {
  const { uid, updated_at, format_version, ...others } = s;
  return {
    ...others,
    id: uid,
    updatedAt: new Date(updated_at),
    formatVersion: format_version,
  };
}

/**
 * Convert a raw space payload into its client shape.
 *
 * @param raw_space - The raw space payload from the API.
 * @returns The converted space object.
 */
export const asSpace = (raw_space: any): any => {
  const sharedOwnerUserUids = asArray(
    raw_space?.shared_owner_user_uids_ss ||
      raw_space?.shared_ower_user_uids_ss ||
      [],
  ).filter(
    (uid: unknown): uid is string => typeof uid === 'string' && uid.length > 0,
  );

  const organizationHandle = raw_space?.organization?.handle;
  const owner: any = raw_space?.owner
    ? asUser(raw_space.owner)
    : {
        id: '',
        handle: '',
        email: '',
        firstName: '',
        lastName: '',
        initials: '',
        displayName: '',
        roles: [],
        iamProviders: [],
        setRoles: () => {},
        unsubscribedFromOutbounds: false,
        onboarding: {} as any,
        events: [],
        settings: {},
      };
  let members: any[] = [];
  if (raw_space.members) {
    members = asArray(raw_space.members).map((m: any) => asUser(m));
  }
  const space: any = {
    id: raw_space.uid,
    handle: raw_space.handle_s,
    type: 'space',
    variant: raw_space.variant_s,
    name: raw_space.name_t,
    description: raw_space.description_t,
    public: raw_space.public_b,
    members,
    creationDate: new Date(raw_space.creation_ts_dt),
    owner,
    organization: organizationHandle
      ? { handle: organizationHandle }
      : undefined,
    sharedOwnerUserUids,
    // Preserve raw Solr fields so consumers can access dynamic fields.
    ...raw_space,
  };
  return space;
};
