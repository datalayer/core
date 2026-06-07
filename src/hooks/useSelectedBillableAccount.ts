/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useBillableAccountStore } from './useBillableAccountStore';
import { useSelectedPrincipal } from './useSelectedPrincipal';

/**
 * Read-only selector for the currently scoped billable account.
 *
 * Use this for billing, quotas, plans, credits, agents, and runtime capacity.
 * For visibility/creation/sharing scope, use {@link useSelectedPrincipal}.
 */
export function useSelectedBillableAccount() {
  const persistedUid = useBillableAccountStore(
    state => state.billableAccountUid,
  );
  const persistedHandle = useBillableAccountStore(
    state => state.billableAccountHandle,
  );
  const {
    selectedPrincipalKind,
    selectedPrincipalUid,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationUid,
    selectedTeamParentOrganizationHandle,
  } = useSelectedPrincipal();

  const billableAccountKind =
    selectedPrincipalKind === 'team'
      ? 'organization'
      : selectedPrincipalKind === 'organization'
        ? 'organization'
        : 'user';

  const billableAccountUid =
    selectedPrincipalKind === 'team'
      ? selectedTeamParentOrganizationUid || persistedUid
      : selectedPrincipalUid || persistedUid;

  const billableAccountHandle =
    selectedPrincipalKind === 'team'
      ? selectedTeamParentOrganizationHandle || persistedHandle
      : selectedPrincipalHandle || persistedHandle;

  return {
    billableAccountKind,
    billableAccountUid,
    billableAccountHandle,
    isUserAccount: billableAccountKind === 'user',
    isOrganizationAccount: billableAccountKind === 'organization',
  };
}

export default useSelectedBillableAccount;
