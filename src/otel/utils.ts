/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Helper utilities for OTEL components.
 *
 * @module otel/utils
 */

import type { OtelSpan } from './types';

/** Parse an ISO timestamp or nanosecond/microsecond epoch to milliseconds. */
export function toMs(ts: string | number): number {
  const n = Number(ts);
  if (!isNaN(n) && n > 1e15) return n / 1e6; // nanos → ms
  if (!isNaN(n) && n > 1e12) return n / 1e3; // micros → ms
  if (!isNaN(n)) return n; // already ms
  return new Date(String(ts)).getTime();
}

/** Format a duration in ms to a human-readable string. */
export function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return '—';
  if (ms < 0.001) return '<1µs';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/** Format an ISO timestamp to local time string. */
export function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions);
  } catch {
    return ts;
  }
}

/** Deterministic color palette for service names. */
const PALETTE = [
  '#0969da', // blue
  '#1a7f37', // green
  '#cf222e', // red
  '#8250df', // purple
  '#bf8700', // amber
  '#0550ae', // dark blue
  '#116329', // dark green
  '#a40e26', // dark red
  '#6639ba', // dark purple
  '#953800', // brown
  '#0e8a16', // lime
  '#e36209', // orange
];

/** Return a deterministic color for a service name (via simple hash). */
export function serviceColor(serviceName: string): string {
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash * 31 + serviceName.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Kind-based color for the span kind indicator dot. */
export function kindColor(kind: string): string {
  switch (kind?.toUpperCase()) {
    case 'SERVER':
      return '#0969da';
    case 'CLIENT':
      return '#1a7f37';
    case 'PRODUCER':
      return '#8250df';
    case 'CONSUMER':
      return '#bf8700';
    case 'INTERNAL':
    default:
      return '#656d76';
  }
}

/** Severity-based color for log severity labels. */
export function severityColor(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'ERROR':
    case 'FATAL':
      return 'danger.fg';
    case 'WARN':
    case 'WARNING':
      return 'attention.fg';
    case 'INFO':
      return 'accent.fg';
    case 'DEBUG':
    case 'TRACE':
      return 'fg.muted';
    default:
      return 'fg.default';
  }
}

/**
 * Build a span tree from a flat list of spans.
 * Returns root spans (those without a parent or whose parent is not in the list)
 * with `children` populated recursively and `depth` set.
 */
export function buildSpanTree(spans: OtelSpan[]): OtelSpan[] {
  const byId = new Map<string, OtelSpan>();
  const enriched: OtelSpan[] = spans.map(s => ({
    ...s,
    children: [],
    depth: 0,
  }));

  for (const s of enriched) {
    byId.set(s.span_id, s);
  }

  const roots: OtelSpan[] = [];

  for (const s of enriched) {
    if (s.parent_span_id && byId.has(s.parent_span_id)) {
      const parent = byId.get(s.parent_span_id)!;
      parent.children = parent.children ?? [];
      parent.children.push(s);
    } else {
      roots.push(s);
    }
  }

  // Set depths
  function setDepth(node: OtelSpan, depth: number) {
    node.depth = depth;
    for (const child of node.children ?? []) {
      setDepth(child, depth + 1);
    }
  }
  for (const root of roots) {
    setDepth(root, 0);
  }

  return roots;
}

/**
 * Flatten a span tree back to a flat list (depth-first) preserving depth info.
 */
export function flattenSpanTree(roots: OtelSpan[]): OtelSpan[] {
  const result: OtelSpan[] = [];
  function walk(node: OtelSpan) {
    result.push(node);
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
  for (const root of roots) {
    walk(root);
  }
  return result;
}
