/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OTEL React components, hooks, and client for visualizing OpenTelemetry
 * signals (traces, logs, metrics) in a Logfire-inspired Live view.
 *
 * Structure:
 *  - `types`  – shared TypeScript types
 *  - `utils`  – pure helpers (formatDuration, buildSpanTree, …)
 *  - `hooks/` – React hooks that read from Datalayer config by default
 *  - `client/`– Typed HTTP client (non-React, reads Datalayer config by default)
 *  - `views/` – React view components
 *
 * @module otel
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  OtelSpan,
  OtelLog,
  OtelMetric,
  OtelSpanEvent,
  OtelSpanLink,
  SignalType,
  OtelLiveProps,
  OtelTracesListProps,
  OtelSpanDetailProps,
  OtelTimelineProps,
  OtelLogsListProps,
  OtelMetricsListProps,
  OtelSpanTreeProps,
  OtelSearchBarProps,
  OtelTimelineRangeSliderProps,
  OtelQueryRow,
  OtelQueryResult,
} from './types';

// ── Utils ─────────────────────────────────────────────────────────────────────
export {
  toMs,
  formatDuration,
  formatTime,
  serviceColor,
  kindColor,
  severityColor,
  severityVariant,
  buildSpanTree,
  flattenSpanTree,
} from './utils';

// ── In the page ───────────────────────────────────────────────────────────────
export {
  createOtelLiveTracer,
  traceparentOf,
  PEER_SERVICE,
  spanConcerns,
  spansOfService,
  useOtelLiveSpans,
  useOtelLiveTracer,
} from './live';
export type {
  OtelAttributeValue,
  OtelAttributes,
  OtelLiveExport,
  OtelLiveSpan,
  OtelLiveTracer,
  OtelLiveTracerOptions,
  OtelSpanContext,
  OtelSpanKindName,
  OtelStartSpanOptions,
} from './live';

// ── Auth helpers ──────────────────────────────────────────────────────────────
export {
  resolveOtelAuth,
  resolveOtelUserUid,
  buildOtelWebSocketUrl,
} from './auth';
export type { ResolvedOtelAuth } from './auth';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export {
  useOtelTraces,
  useOtelTrace,
  useOtelLogs,
  useOtelMetrics,
  useOtelServices,
  useOtelStats,
  useOtelQuery,
  useOtelSystem,
  useOtelWebSocket,
  setOtelOnUnauthorized,
} from './hooks';
export type {
  OtelWsMessage,
  OtelWsCallbacks,
  OtelSystemData,
  OtelSystemProcess,
  OtelSystemDisk,
  OtelSystemTable,
} from './hooks';

// ── Client ────────────────────────────────────────────────────────────────────
export { OtelClient, createOtelClient } from './client';
export type {
  OtelClientOptions,
  FetchTracesOptions,
  FetchLogsOptions,
  FetchMetricsOptions,
  FetchMetricTotalOptions,
} from './client';

// ── Views ─────────────────────────────────────────────────────────────────────
export { OtelLive } from './views';
export { OtelTracesList } from './views';
export { OtelSpanDetail } from './views';
export { OtelSpanTree } from './views';
export { OtelLogsList } from './views';
export { OtelSearchBar } from './views';
export { OtelMetricsList } from './views';
export { OtelMetricsChart } from './views';
export type { OtelMetricsChartProps } from './views';
export { OtelTimeline } from './views';
export {
  OtelLiveSpans,
  DEFAULT_SPAN_FACETS,
  filterSpansByFacets,
  unfoldedValue,
} from './views';
export type { OtelLiveSpansProps, OtelSpanFacet } from './views';
export { OtelTimelineRangeSlider } from './views';
export { OtelSqlView } from './views';
export type { OtelSqlViewProps } from './views';
export { OtelSystemView } from './views';
export type { OtelSystemViewProps } from './views';
