/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useUsageRefreshStore } from './useUsageRefreshStore';

/**
 * The kind of billable account currently in scope.
 *
 * An account is the *billable* principal — only users and organizations
 * are accounts. Teams are NOT accounts; when a team is the selected
 * principal, the billable account is the team's parent organization.
 */
export type BillableAccountKind = 'user' | 'organization';

export type BillableAccountState = {
  billableAccountKind: BillableAccountKind;
  billableAccountUid?: string;
  billableAccountHandle?: string;

  setBillableAccount: (args: {
    kind: BillableAccountKind;
    uid: string;
    handle: string;
  }) => void;
  resetBillableAccount: () => void;
};

export const useBillableAccountStore = create<BillableAccountState>()(
  persist(
    set => ({
      billableAccountKind: 'user',
      billableAccountUid: undefined,
      billableAccountHandle: undefined,
      setBillableAccount: ({ kind, uid, handle }) =>
        set(state => {
          const unchanged =
            state.billableAccountKind === kind &&
            state.billableAccountUid === uid &&
            state.billableAccountHandle === handle;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('billable-account-changed');
          return {
            billableAccountKind: kind,
            billableAccountUid: uid,
            billableAccountHandle: handle,
          };
        }),
      resetBillableAccount: () =>
        set(state => {
          const unchanged =
            state.billableAccountKind === 'user' &&
            state.billableAccountUid === undefined &&
            state.billableAccountHandle === undefined;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('billable-account-reset');
          return {
            billableAccountKind: 'user',
            billableAccountUid: undefined,
            billableAccountHandle: undefined,
          };
        }),
    }),
    {
      name: 'datalayer-billable-account',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        billableAccountKind: state.billableAccountKind,
        billableAccountUid: state.billableAccountUid,
        billableAccountHandle: state.billableAccountHandle,
      }),
    },
  ),
);

export default useBillableAccountStore;
