/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { IBaseTeam } from '../../models';
import { TEAMS_MOCK } from '../../mocks';

export type ITeamState = {
  teams: IBaseTeam[];
};

export type TeamState = ITeamState & {
  update: (teams: IBaseTeam[]) => void;
};

export const teamStore = createStore<TeamState>((set, get) => ({
  teams: TEAMS_MOCK,
  update: (teams: IBaseTeam[]) =>
    set((state: TeamState) => ({
      teams,
    })),
}));

export function useTeamStore(): TeamState;
export function useTeamStore<T>(selector: (state: TeamState) => T): T;
export function useTeamStore<T>(selector?: (state: TeamState) => T) {
  return useStore(teamStore, selector!);
}

export default useTeamStore;
