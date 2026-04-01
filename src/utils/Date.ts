/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

//- Taken from https://stackoverflow.com/questions/6108819/javascript-timestamp-to-relative-time
// in miliseconds
const units = {
  year: 24 * 60 * 60 * 1000 * 365,
  month: (24 * 60 * 60 * 1000 * 365) / 12,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

const rtf = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  style: 'short',
});

export const getRelativeTime = (d1: Date, d2: Date = new Date()): string => {
  const elapsed = d1.getTime() - d2.getTime();

  // "Math.abs" accounts for both "past" & "future" scenarios
  for (const u in units)
    if (Math.abs(elapsed) > units[u] || u === 'second')
      return rtf.format(
        Math.round(elapsed / units[u]),
        u as Intl.RelativeTimeFormatUnit,
      );

  return 'now';
};

//-

const p = (i: number) => {
  return i > 1 ? 's' : '';
};

export const timeSince = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    const i = Math.floor(interval);
    return i + ` year${p(i)}`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    const i = Math.floor(interval);
    return i + ` month${p(i)}`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    const i = Math.floor(interval);
    return i + ` day${p(i)}`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const i = Math.floor(interval);
    return i + ` hour${p(i)}`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    const i = Math.floor(interval);
    return i + ` minute${p(i)}`;
  }
  const i = Math.floor(interval);
  return i + ` second${p(i)}`;
};

/**
 * Format a timestamp into a compact relative string.
 *
 * Examples: "just now", "15m ago", "3h ago", "2d ago", "4w ago", "1y ago".
 */
export const formatRelativeTime = (
  value?: Date | string | number,
  now: Date = new Date(),
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date =
    value instanceof Date
      ? value
      : typeof value === 'number'
        ? new Date(value)
        : new Date(value);

  const ts = date.getTime();
  if (Number.isNaN(ts)) {
    return typeof value === 'string' ? value : undefined;
  }

  const diffMs = Math.max(0, now.getTime() - ts);
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

/**
 * Format a duration in milliseconds into a human-readable string.
 *
 * Examples:
 * - 500 → "< 1s"
 * - 1500 → "1s"
 * - 65000 → "1m 5s"
 * - 3661000 → "1h 1m 1s"
 * - 90061000 → "1d 1h 1m"
 */
export const formatDurationMs = (ms: number): string => {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  if (totalSeconds < 1) return '< 1s';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '< 1s';
};
