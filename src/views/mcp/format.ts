/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The small readings every MCP surface shares: how long ago, how long it
 * took, and whether a client is still there.
 *
 * Plain functions with no React in them, so the wording of "4m ago" is one
 * decision rather than one per view.
 *
 * @module views/mcp/format
 */

/** A client that called within this window is drawn as active. */
export const MCP_ACTIVE_WINDOW_MS = 5 * 60_000;

/**
 * A client idle longer than this has left the activity answer, and its card
 * leaves the home grid — the same window the gateway bounds `/activity` by.
 */
export const MCP_ACTIVITY_WINDOW_MS = 30 * 60_000;

/** Where a client is, from when it last called. */
export type McpClientStatus = 'active' | 'idle' | 'disconnected';

export const clientStatusOf = (
  lastCallAt: string | null | undefined,
  now: number = Date.now(),
): McpClientStatus => {
  if (!lastCallAt) {
    // A grant that has never been used is connected but has done nothing.
    return 'idle';
  }
  const at = Date.parse(lastCallAt);
  if (Number.isNaN(at)) {
    return 'idle';
  }
  const age = now - at;
  if (age <= MCP_ACTIVE_WINDOW_MS) {
    return 'active';
  }
  return age <= MCP_ACTIVITY_WINDOW_MS ? 'idle' : 'disconnected';
};

/** How long ago a moment was, in the words the home page uses. */
export const timeAgo = (iso: string | null | undefined, now: number = Date.now()): string => {
  if (!iso) {
    return '';
  }
  const at = Date.parse(iso);
  if (Number.isNaN(at)) {
    return '';
  }
  const seconds = Math.max(0, (now - at) / 1000);
  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
};

/** A duration in the unit that reads: milliseconds, seconds, minutes. */
export const durationLabel = (milliseconds: number | null | undefined): string => {
  if (milliseconds === null || milliseconds === undefined) {
    return '';
  }
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  if (milliseconds < 60_000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
};

/** A count in the page's terms: `1 call`, `12 calls`, `no call`. */
export const plural = (count: number, singular: string, many = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : many}`;
