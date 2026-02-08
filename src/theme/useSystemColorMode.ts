/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';

type ResolvedColorMode = 'light' | 'dark';

/**
 * React hook that tracks the operating system's preferred color scheme.
 *
 * Listens to `prefers-color-scheme` media query changes and returns
 * either `'light'` or `'dark'`.
 */
export function useSystemColorMode(): ResolvedColorMode {
  const getMode = (): ResolvedColorMode =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const [mode, setMode] = useState<ResolvedColorMode>(getMode);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = (e: MediaQueryListEvent) =>
      setMode(e.matches ? 'dark' : 'light');

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return mode;
}

export default useSystemColorMode;
