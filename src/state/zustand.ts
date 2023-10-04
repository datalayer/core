import { create } from 'zustand';

export type ZustandState = {
  tab: number;
  setTab: (tab: number) => void,
}

export const useStore = create<ZustandState>((set) => ({
  tab: 0.0,
  setTab: (tab: number) => set((state: ZustandState) => ({ tab })),
}));

export default useStore;
