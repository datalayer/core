/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useMemo, useState } from 'react';
import { Tooltip } from '@primer/react';
import { formatDateTimeDetails, formatRelativeTime } from '../../utils';

type ILiveRelativeTimeProps = {
  value?: Date | string | number;
  refreshIntervalMs?: number;
  fallback?: string;
  showTooltip?: boolean;
};

/**
 * Display a live-updating relative time label (e.g. "5m ago", "in 2m").
 *
 * When `showTooltip` is true, a Primer tooltip shows ISO + localized datetime
 * details with timezone information.
 */
export function LiveRelativeTime({
  value,
  refreshIntervalMs = 30_000,
  fallback = '—',
  showTooltip = true,
}: ILiveRelativeTimeProps): JSX.Element {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refreshIntervalMs]);

  const label = useMemo(() => formatRelativeTime(value, now), [value, now]);
  const tooltip = useMemo(() => formatDateTimeDetails(value), [value]);
  const content = (
    <button
      type="button"
      aria-label={tooltip || 'Date and time details'}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        font: 'inherit',
        color: 'inherit',
        cursor: 'inherit',
        lineHeight: 'inherit',
      }}
    >
      {label ?? fallback}
    </button>
  );

  if (!showTooltip || !tooltip) {
    return content;
  }

  return <Tooltip text={tooltip}>{content}</Tooltip>;
}
