/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useUsageRefreshStore } from './useUsageRefreshStore';

/**
 * The kind of billing entity currently in scope.
 *
 * An account is the *billing* principal — only users and organizations
 * are accounts. Teams are NOT accounts; when a team is the selected
 * principal, the billing entity is the team's parent organization.
 */
export type BillingEntityKind = 'user' | 'organization';

export type BillingEntityState = {
  billingEntityKind: BillingEntityKind;
  billingEntityUid?: string;
  billingEntityHandle?: string;

  setBillingEntity: (args: {
    kind: BillingEntityKind;
    uid: string;
    handle: string;
  }) => void;
  resetBillingEntity: () => void;
};

export const useBillingEntityStore = create<BillingEntityState>()(
  persist(
    set => ({
      billingEntityKind: 'user',
      billingEntityUid: undefined,
      billingEntityHandle: undefined,
      setBillingEntity: ({ kind, uid, handle }) =>
        set(state => {
          const unchanged =
            state.billingEntityKind === kind &&
            state.billingEntityUid === uid &&
            state.billingEntityHandle === handle;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('billing-entity-changed');
          return {
            billingEntityKind: kind,
            billingEntityUid: uid,
            billingEntityHandle: handle,
          };
        }),
      resetBillingEntity: () =>
        set(state => {
          const unchanged =
            state.billingEntityKind === 'user' &&
            state.billingEntityUid === undefined &&
            state.billingEntityHandle === undefined;
          if (unchanged) {
            return state;
          }
          useUsageRefreshStore
            .getState()
            .requestUsageRefresh('billing-entity-reset');
          return {
            billingEntityKind: 'user',
            billingEntityUid: undefined,
            billingEntityHandle: undefined,
          };
        }),
    }),
    {
      name: 'datalayer-billing-entity',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        billingEntityKind: state.billingEntityKind,
        billingEntityUid: state.billingEntityUid,
        billingEntityHandle: state.billingEntityHandle,
      }),
    },
  ),
);

export default useBillingEntityStore;
