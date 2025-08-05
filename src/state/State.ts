/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { coreStore } from './substates/CoreState';
import { cellStore } from './substates/CellState';
import { documentStore } from './substates/DocumentState';
import { gradeStore } from './substates/GradeState';
import { iamStore } from './substates/IAMState';
import { runtimesStore } from './substates/RuntimesState';
import { layoutStore } from './substates/LayoutState';
import { nbformatStore } from './substates/NbformatState';
import { organizationStore } from './substates/OrganizationState';
import { spaceStore } from './substates/SpaceState';
import { surveysStore } from './substates/SurveysState';
import { teamStore } from './substates/TeamState';
import { isDevDeployment } from '../utils'

export type DatalayerRunState = {
  version: string;
  setVersion: (version: string) => void;
  isDev: boolean;
  core: typeof coreStore.getState;
  cell: typeof cellStore.getState;
  document: typeof documentStore.getState;
  grade: typeof gradeStore.getState;
  iam: typeof iamStore.getState;
  kernels: typeof runtimesStore.getState;
  layout: typeof layoutStore.getState;
  nbformat: typeof nbformatStore.getState;
  organization: typeof organizationStore.getState;
  space: typeof spaceStore.getState;
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
  cell: cellStore.getState,
  document: documentStore.getState,
  grade: gradeStore.getState,
  iam: iamStore.getState,
  kernels: runtimesStore.getState,
  layout: layoutStore.getState,
  nbformat: nbformatStore.getState,
  organization: organizationStore.getState,
  space: spaceStore.getState,
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
