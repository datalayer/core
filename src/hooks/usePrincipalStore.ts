/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useUsageRefreshStore } from './useUsageRefreshStore';

const PRINCIPAL_CONTEXT_COOKIE = 'datalayer-principal-context';
const PRINCIPAL_CONTEXT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type PrincipalContextCookie = {
  selectedPrincipalKind?: PrincipalKind;
  selectedPrincipalUid?: string;
  selectedPrincipalHandle?: string;
  selectedTeamParentOrganizationUid?: string;
  selectedTeamParentOrganizationHandle?: string;
};

const readPrincipalContextCookie = (): PrincipalContextCookie => {
  if (typeof document === 'undefined') {
    return {};
  }
  const escaped = PRINCIPAL_CONTEXT_COOKIE.replace(
    /[-[\]{}()*+?.,\\^$|#\s]/g,
    '\\$&',
  );
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`),
  );
  if (!match?.[1]) {
    return {};
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const kind =
      parsed.selectedPrincipalKind === 'organization' ||
      parsed.selectedPrincipalKind === 'team' ||
      parsed.selectedPrincipalKind === 'personal'
        ? parsed.selectedPrincipalKind
        : undefined;
    return {
      selectedPrincipalKind: kind,
      selectedPrincipalUid:
        typeof parsed.selectedPrincipalUid === 'string'
          ? parsed.selectedPrincipalUid
          : undefined,
      selectedPrincipalHandle:
        typeof parsed.selectedPrincipalHandle === 'string'
          ? parsed.selectedPrincipalHandle
          : undefined,
      selectedTeamParentOrganizationUid:
        typeof parsed.selectedTeamParentOrganizationUid === 'string'
          ? parsed.selectedTeamParentOrganizationUid
          : undefined,
      selectedTeamParentOrganizationHandle:
        typeof parsed.selectedTeamParentOrganizationHandle === 'string'
          ? parsed.selectedTeamParentOrganizationHandle
          : undefined,
    };
  } catch {
    return {};
  }
};

const writePrincipalContextCookie = (context: {
  selectedPrincipalKind: PrincipalKind;
  selectedPrincipalUid?: string;
  selectedPrincipalHandle?: string;
  selectedTeamParentOrganizationUid?: string;
  selectedTeamParentOrganizationHandle?: string;
}): void => {
  if (typeof document === 'undefined') {
    return;
  }
  const value = encodeURIComponent(JSON.stringify(context));
  document.cookie =
    `${PRINCIPAL_CONTEXT_COOKIE}=${value};` +
    ` path=/; max-age=${PRINCIPAL_CONTEXT_COOKIE_MAX_AGE}; SameSite=Lax`;
};

const clearPrincipalContextCookie = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie =
    `${PRINCIPAL_CONTEXT_COOKIE}=;` +
    ' path=/; max-age=0; SameSite=Lax';
};

const initialPrincipalContext = readPrincipalContextCookie();

/**
 * The kind of principal currently selected in the Principal Switcher.
 *
 * A principal is the entity used for *UI scoping* — visibility, creation,
 * and sharing of artifacts. Only user / organization / team are principals.
 * Agents are NOT principals (an agent is owned by an account).
 */
export type PrincipalKind = 'personal' | 'organization' | 'team';

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

  selectPersonalPrincipal: (uid: string, handle: string) => void;
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
      selectedPrincipalKind: initialPrincipalContext.selectedPrincipalKind || 'personal',
      selectedPrincipalUid: initialPrincipalContext.selectedPrincipalUid,
      selectedPrincipalHandle: initialPrincipalContext.selectedPrincipalHandle,
      selectedTeamParentOrganizationUid:
        initialPrincipalContext.selectedTeamParentOrganizationUid,
      selectedTeamParentOrganizationHandle:
        initialPrincipalContext.selectedTeamParentOrganizationHandle,
      selectPersonalPrincipal: (uid, handle) =>
        set(state => {
          const unchanged =
            state.selectedPrincipalKind === 'personal' &&
            state.selectedPrincipalUid === uid &&
            state.selectedPrincipalHandle === handle;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('principal-user-changed');
          const nextState = {
            selectedPrincipalKind: 'personal' as const,
            selectedPrincipalUid: uid,
            selectedPrincipalHandle: handle,
            selectedTeamParentOrganizationUid: undefined,
            selectedTeamParentOrganizationHandle: undefined,
          };
          writePrincipalContextCookie(nextState);
          return nextState;
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
          const nextState = {
            selectedPrincipalKind: 'organization' as const,
            selectedPrincipalUid: uid,
            selectedPrincipalHandle: handle,
            selectedTeamParentOrganizationUid: undefined,
            selectedTeamParentOrganizationHandle: undefined,
          };
          writePrincipalContextCookie(nextState);
          return nextState;
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
          const nextState = {
            selectedPrincipalKind: 'team' as const,
            selectedPrincipalUid: teamUid,
            selectedPrincipalHandle: teamHandle,
            selectedTeamParentOrganizationUid: organizationUid,
            selectedTeamParentOrganizationHandle: organizationHandle,
          };
          writePrincipalContextCookie(nextState);
          return nextState;
        }),
      resetPrincipal: () =>
        set(state => {
          const unchanged =
            state.selectedPrincipalKind === 'personal' &&
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
          const nextState: Partial<PrincipalState> = {
            selectedPrincipalKind: 'personal',
            selectedPrincipalUid: undefined,
            selectedPrincipalHandle: undefined,
            selectedTeamParentOrganizationUid: undefined,
            selectedTeamParentOrganizationHandle: undefined,
          };
          clearPrincipalContextCookie();
          return nextState;
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
      onRehydrateStorage: () => state => {
        if (!state) {
          return;
        }
        if (state.selectedPrincipalKind === 'personal' && !state.selectedPrincipalUid) {
          clearPrincipalContextCookie();
          return;
        }
        writePrincipalContextCookie({
          selectedPrincipalKind: state.selectedPrincipalKind,
          selectedPrincipalUid: state.selectedPrincipalUid,
          selectedPrincipalHandle: state.selectedPrincipalHandle,
          selectedTeamParentOrganizationUid:
            state.selectedTeamParentOrganizationUid,
          selectedTeamParentOrganizationHandle:
            state.selectedTeamParentOrganizationHandle,
        });
      },
    },
  ),
);

export default usePrincipalStore;
