import { create } from 'zustand';

export type ZustandState = {
  tab: number;
  getIntTab: () => number;
  setTab: (tab: number) => void,
}

export const useStore = create<ZustandState>((set, get) => ({
  tab: 0.0,
  getIntTab: () => Math.floor(get().tab),
  setTab: (tab: number) => set((state: ZustandState) => ({ tab })),
}));

export default useStore;
