/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { ICell } from '../../models';

export type ICellState = {
  cell?: ICell;
}

export type CellState = ICellState & {
  create: (cell: ICell) => void;
  update: (cell: Partial<ICell>) => void;
};

export const cellStore = createStore<CellState>((set, get) => ({
  cell: undefined,
  create: (cell: ICell) => set((state: CellState) => ({ cell })),
  update: (cell: Partial<ICell>) => set((state: CellState) => ({
    cell:
      cell ? {
        ...state.cell,
        ...cell as ICell,
      }
      : undefined
    })
  ),
}));

export function useCellStore(): CellState;
export function useCellStore<T>(selector: (state: CellState) => T): T;
export function useCellStore<T>(selector?: (state: CellState) => T) {
  return useStore(cellStore, selector!);
}

export default useCellStore;
