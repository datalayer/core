/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useBillingEntityStore } from './useBillingEntityStore';
import { useSelectedPrincipal } from './useSelectedPrincipal';

/**
 * Read-only selector for the currently scoped billing entity.
 *
 * Use this for billing, quotas, plans, credits, agents, and runtime capacity.
 * For visibility/creation/sharing scope, use {@link useSelectedPrincipal}.
 */
export function useSelectedBillingEntity() {
  const persistedUid = useBillingEntityStore(state => state.billingEntityUid);
  const persistedHandle = useBillingEntityStore(
    state => state.billingEntityHandle,
  );
  const {
    selectedPrincipalKind,
    selectedPrincipalUid,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationUid,
    selectedTeamParentOrganizationHandle,
  } = useSelectedPrincipal();

  const billingEntityKind =
    selectedPrincipalKind === 'team'
      ? 'organization'
      : selectedPrincipalKind === 'organization'
        ? 'organization'
        : 'user';

  const billingEntityUid =
    selectedPrincipalKind === 'team'
      ? selectedTeamParentOrganizationUid || persistedUid
      : selectedPrincipalUid || persistedUid;

  const billingEntityHandle =
    selectedPrincipalKind === 'team'
      ? selectedTeamParentOrganizationHandle || persistedHandle
      : selectedPrincipalHandle || persistedHandle;

  return {
    billingEntityKind,
    billingEntityUid,
    billingEntityHandle,
    isUserAccount: billingEntityKind === 'user',
    isOrganizationAccount: billingEntityKind === 'organization',
  };
}

export default useSelectedBillingEntity;
