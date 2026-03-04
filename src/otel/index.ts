/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OTEL React components for visualizing OpenTelemetry signals
 * (traces, logs, metrics) in a Logfire-inspired Live view.
 *
 * @module otel
 */

// Types
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
  OtelSpanTreeProps,
  OtelSearchBarProps,
} from './types';

// Hooks
export {
  useOtelTraces,
  useOtelTrace,
  useOtelLogs,
  useOtelMetrics,
  useOtelServices,
  useOtelStats,
} from './hooks';

// Components
export { OtelTimeline } from './OtelTimeline';
export { OtelTracesList } from './OtelTracesList';
export { OtelSpanDetail } from './OtelSpanDetail';
export { OtelSpanTree } from './OtelSpanTree';
export { OtelLogsList } from './OtelLogsList';
export { OtelSearchBar } from './OtelSearchBar';
export { OtelLive } from './OtelLive';
