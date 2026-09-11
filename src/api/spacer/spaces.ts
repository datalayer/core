/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An account's managed spaces: the benchmarks space, where a launch's reports
 * and evidence are written, and the orchestration space, where what agents
 * produced for the account's executions is written.
 *
 * One of each per account — the person, or an organization or a team they
 * belong to — made by Spacer on first use, following the account's membership
 * and never offered in the create flow. The answer names the two path
 * segments the app opens an object of the space under:
 * `/{account_handle}/{handle}/documents/{uid}`.
 *
 * @module api/spacer/spaces
 */

import {
  spacerRequest,
  spacerSegment,
  type SpacerClientOptions,
} from './request';

export type ManagedSpaceKind = 'benchmarks' | 'orchestration';

export interface ManagedSpace {
  uid: string;
  id?: string;
  handle: string;
  name: string;
  variant: string;
  account_uid: string;
  account_type: 'user' | 'organization' | 'team';
  /** The handle of the account the space belongs to, as the app's paths start. */
  account_handle: string;
  organization_uid?: string;
  team_uid?: string;
}

/**
 * An account's managed space of a kind, made by Spacer on first use.
 *
 * @param options - The Spacer origin and the caller's token.
 * @param kind - `benchmarks` or `orchestration`.
 * @param accountUid - The organization or team; the caller when omitted.
 * @returns The space.
 */
export const getManagedSpace = async (
  options: SpacerClientOptions,
  kind: ManagedSpaceKind,
  accountUid?: string,
): Promise<ManagedSpace> => {
  const answer = await spacerRequest<{ success: boolean; space: ManagedSpace }>(
    options,
    `/spaces/${spacerSegment(kind)}`,
    { query: { account_uid: accountUid } },
  );
  return answer.space;
};
