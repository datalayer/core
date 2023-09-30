import { create } from 'zustand';

export type ZustandState = {
  tabIndex: number;
  setTabIndex: (tabIndex: number) => void,
}

export const useZustandStore = create<ZustandState>((set) => ({
  tabIndex: 0,
  setTabIndex: (tabIndex: number) => set((state: ZustandState) => ({ tabIndex})),
}));

export default useZustandStore;
