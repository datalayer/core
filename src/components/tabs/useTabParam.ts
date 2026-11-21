/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The open tab kept in the address under `param` (`tab` by default): the
 * first of `ids` when absent or unknown, and dropped from the address when it
 * is the first, so the view's own address opens it.
 */
export function useTabParam<T extends string>(
  ids: ReadonlyArray<T>,
  param = 'tab',
): [T, (id: T) => void] {
  const [search, setSearch] = useSearchParams();
  const asked = search.get(param);
  const open = (ids as ReadonlyArray<string>).includes(asked ?? '')
    ? (asked as T)
    : ids[0];
  const choose = useCallback(
    (id: T) => {
      const next = new URLSearchParams(search);
      if (id === ids[0]) {
        next.delete(param);
      } else {
        next.set(param, id);
      }
      setSearch(next, { replace: true });
    },
    [search, setSearch, ids, param],
  );
  return [open, choose];
}
