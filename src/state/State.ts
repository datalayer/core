/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { coreStore } from './substates/CoreState';
import { iamStore } from './substates/IAMState';
import { layoutStore } from './substates/LayoutState';
import { organizationStore } from './substates/OrganizationState';
import { surveysStore } from './substates/SurveysState';
import { teamStore } from './substates/TeamState';
import { isDevDeployment } from '../utils';

export type DatalayerRunState = {
  version: string;
  setVersion: (version: string) => void;
  isDev: boolean;
  core: typeof coreStore.getState;
  iam: typeof iamStore.getState;
  layout: typeof layoutStore.getState;
  organization: typeof organizationStore.getState;
  success: typeof surveysStore.getState;
  team: typeof teamStore.getState;
};

export const runStore = createStore<DatalayerRunState>((set, get) => ({
  version: '',
  setVersion: version => {
    if (version && !get().version) {
      set(state => ({ version }));
    }
  },
  isDev: isDevDeployment(),
  core: coreStore.getState,
  iam: iamStore.getState,
  layout: layoutStore.getState,
  organization: organizationStore.getState,
  success: surveysStore.getState,
  team: teamStore.getState,
}));

// TODO Reuse code portions from JupyterContext
export function useRunStore(): DatalayerRunState;
export function useRunStore<T>(selector: (state: DatalayerRunState) => T): T;
export function useRunStore<T>(selector?: (state: DatalayerRunState) => T) {
  return useStore(runStore, selector!);
}

export default useRunStore;
