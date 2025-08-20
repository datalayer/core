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
