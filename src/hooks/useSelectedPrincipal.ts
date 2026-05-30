/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { usePrincipalStore } from './usePrincipalStore';

/**
 * Read-only selector for the currently selected principal (UI scope).
 *
 * Use this for visibility, creation, and sharing of artifacts.
 * For billing, quotas, plans, and agents, use {@link useSelectedBillableAccount}.
 */
export function useSelectedPrincipal() {
  const selectedPrincipalKind = usePrincipalStore(
    state => state.selectedPrincipalKind,
  );
  const selectedPrincipalUid = usePrincipalStore(
    state => state.selectedPrincipalUid,
  );
  const selectedPrincipalHandle = usePrincipalStore(
    state => state.selectedPrincipalHandle,
  );
  const selectedTeamParentOrganizationUid = usePrincipalStore(
    state => state.selectedTeamParentOrganizationUid,
  );
  const selectedTeamParentOrganizationHandle = usePrincipalStore(
    state => state.selectedTeamParentOrganizationHandle,
  );
  return {
    selectedPrincipalKind,
    selectedPrincipalUid,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationUid,
    selectedTeamParentOrganizationHandle,
    isUserSelected: selectedPrincipalKind === 'user',
    isOrganizationSelected: selectedPrincipalKind === 'organization',
    isTeamSelected: selectedPrincipalKind === 'team',
  };
}

export default useSelectedPrincipal;
