/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { IDatasource } from '../../models';

export type IDatasourceState = {
  datasources: IDatasource[];
}

export type DatasourceState = IDatasourceState & {
  updateDatasources: (datasources: IDatasource[]) => void;
};

export const datasourceStore = createStore<DatasourceState>((set, get) => ({
  datasources: [],
  updateDatasources: (datasources: IDatasource[]) => set((state: DatasourceState) => ({
    datasources
  })),
}));

export function useDatasourceStore(): DatasourceState;
export function useDatasourceStore<T>(selector: (state: DatasourceState) => T): T;
export function useDatasourceStore<T>(selector?: (state: DatasourceState) => T) {
  return useStore(datasourceStore, selector!);
}

export default useDatasourceStore;
