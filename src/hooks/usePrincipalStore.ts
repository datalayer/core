/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useUsageRefreshStore } from './useUsageRefreshStore';

/**
 * The kind of principal currently selected in the Principal Switcher.
 *
 * A principal is the entity used for *UI scoping* — visibility, creation,
 * and sharing of artifacts. Only user / organization / team are principals.
 * Agents are NOT principals (an agent is owned by an account).
 */
export type PrincipalKind = 'user' | 'organization' | 'team';

export type PrincipalState = {
  /** Kind of the currently selected principal. */
  selectedPrincipalKind: PrincipalKind;
  /** UID of the selected principal (user UID, org UID, or team UID). */
  selectedPrincipalUid?: string;
  /** Handle of the selected principal. */
  selectedPrincipalHandle?: string;
  /** Parent organization UID — set only when `selectedPrincipalKind === 'team'`. */
  selectedTeamParentOrganizationUid?: string;
  /** Parent organization handle — set only when `selectedPrincipalKind === 'team'`. */
  selectedTeamParentOrganizationHandle?: string;

  selectUserPrincipal: (uid: string, handle: string) => void;
  selectOrganizationPrincipal: (uid: string, handle: string) => void;
  selectTeamPrincipal: (args: {
    teamUid: string;
    teamHandle: string;
    organizationUid: string;
    organizationHandle: string;
  }) => void;
  resetPrincipal: () => void;
};

export const usePrincipalStore = create<PrincipalState>()(
  persist(
    set => ({
      selectedPrincipalKind: 'user',
      selectedPrincipalUid: undefined,
      selectedPrincipalHandle: undefined,
      selectedTeamParentOrganizationUid: undefined,
      selectedTeamParentOrganizationHandle: undefined,
      selectUserPrincipal: (uid, handle) =>
        set(state => {
          const unchanged =
            state.selectedPrincipalKind === 'user' &&
            state.selectedPrincipalUid === uid &&
            state.selectedPrincipalHandle === handle;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('principal-user-changed');
          return {
            selectedPrincipalKind: 'user',
            selectedPrincipalUid: uid,
            selectedPrincipalHandle: handle,
            selectedTeamParentOrganizationUid: undefined,
            selectedTeamParentOrganizationHandle: undefined,
          };
        }),
      selectOrganizationPrincipal: (uid, handle) =>
        set(state => {
          const unchanged =
            state.selectedPrincipalKind === 'organization' &&
            state.selectedPrincipalUid === uid &&
            state.selectedPrincipalHandle === handle;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('principal-organization-changed');
          return {
            selectedPrincipalKind: 'organization',
            selectedPrincipalUid: uid,
            selectedPrincipalHandle: handle,
            selectedTeamParentOrganizationUid: undefined,
            selectedTeamParentOrganizationHandle: undefined,
          };
        }),
      selectTeamPrincipal: ({
        teamUid,
        teamHandle,
        organizationUid,
        organizationHandle,
      }) =>
        set(state => {
          const unchanged =
            state.selectedPrincipalKind === 'team' &&
            state.selectedPrincipalUid === teamUid &&
            state.selectedPrincipalHandle === teamHandle &&
            state.selectedTeamParentOrganizationUid === organizationUid &&
            state.selectedTeamParentOrganizationHandle === organizationHandle;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('principal-team-changed');
          return {
            selectedPrincipalKind: 'team',
            selectedPrincipalUid: teamUid,
            selectedPrincipalHandle: teamHandle,
            selectedTeamParentOrganizationUid: organizationUid,
            selectedTeamParentOrganizationHandle: organizationHandle,
          };
        }),
      resetPrincipal: () =>
        set(state => {
          const unchanged =
            state.selectedPrincipalKind === 'user' &&
            state.selectedPrincipalUid === undefined &&
            state.selectedPrincipalHandle === undefined &&
            state.selectedTeamParentOrganizationUid === undefined &&
            state.selectedTeamParentOrganizationHandle === undefined;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('principal-reset');
          return {
            selectedPrincipalKind: 'user',
            selectedPrincipalUid: undefined,
            selectedPrincipalHandle: undefined,
            selectedTeamParentOrganizationUid: undefined,
            selectedTeamParentOrganizationHandle: undefined,
          };
        }),
    }),
    {
      name: 'datalayer-principal',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        selectedPrincipalKind: state.selectedPrincipalKind,
        selectedPrincipalUid: state.selectedPrincipalUid,
        selectedPrincipalHandle: state.selectedPrincipalHandle,
        selectedTeamParentOrganizationUid:
          state.selectedTeamParentOrganizationUid,
        selectedTeamParentOrganizationHandle:
          state.selectedTeamParentOrganizationHandle,
      }),
    },
  ),
);

export default usePrincipalStore;
