/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useMemo, useState } from 'react';
import { formatRelativeTime } from '../../utils';

type ILiveRelativeTimeProps = {
  value?: Date | string | number;
  refreshIntervalMs?: number;
  fallback?: string;
};

/**
 * Display a live-updating relative time label (e.g. "5m ago").
 */
export function LiveRelativeTime({
  value,
  refreshIntervalMs = 1000,
  fallback = '—',
}: ILiveRelativeTimeProps): JSX.Element {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refreshIntervalMs]);

  const label = useMemo(() => formatRelativeTime(value, now), [value, now]);

  return <>{label ?? fallback}</>;
}
