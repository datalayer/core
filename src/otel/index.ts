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
  OtelMetricsListProps,
  OtelSpanTreeProps,
  OtelSearchBarProps,
  OtelTimelineRangeSliderProps,
  OtelQueryRow,
  OtelQueryResult,
} from './types';

// Hooks
export {
  useOtelTraces,
  useOtelTrace,
  useOtelLogs,
  useOtelMetrics,
  useOtelServices,
  useOtelStats,
  useOtelQuery,
  useOtelWebSocket,
} from './hooks';

// WebSocket types
export type { OtelWsMessage, OtelWsCallbacks } from './hooks';

// Components
export { OtelTimeline } from './OtelTimeline';
export { OtelTracesList } from './OtelTracesList';
export { OtelSpanDetail } from './OtelSpanDetail';
export { OtelSpanTree } from './OtelSpanTree';
export { OtelLogsList } from './OtelLogsList';
export { OtelSearchBar } from './OtelSearchBar';
export { OtelMetricsList } from './OtelMetricsList';
export { OtelMetricsChart } from './OtelMetricsChart';
export type { OtelMetricsChartProps } from './OtelMetricsChart';
export { OtelLive } from './OtelLive';
export { OtelTimelineRangeSlider } from './OtelTimelineRangeSlider';
export { OtelSqlView } from './OtelSqlView';
export type { OtelSqlViewProps } from './OtelSqlView';
