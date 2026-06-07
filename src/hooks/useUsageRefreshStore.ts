/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';

export type UsageRefreshState = {
  refreshToken: number;
  lastReason?: string;
  lastRequestedAt?: number;
  requestUsageRefresh: (reason?: string) => void;
};

export const useUsageRefreshStore = create<UsageRefreshState>()(set => ({
  refreshToken: 0,
  lastReason: undefined,
  lastRequestedAt: undefined,
  requestUsageRefresh: (reason?: string) =>
    set(state => ({
      refreshToken: state.refreshToken + 1,
      lastReason: reason,
      lastRequestedAt: Date.now(),
    })),
}));

export default useUsageRefreshStore;
