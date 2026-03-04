/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TypeScript types for the OTEL React components.
 *
 * @module otel/types
 */

/** A single span in a trace. */
export interface OtelSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  span_name: string;
  service_name: string;
  kind: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status_code?: string;
  status_message?: string;
  otel_scope_name?: string;
  attributes?: Record<string, unknown>;
  events?: OtelSpanEvent[];
  links?: OtelSpanLink[];
  /** Nested children (computed client-side from parent_span_id). */
  children?: OtelSpan[];
  /** Depth in a span tree (computed client-side). */
  depth?: number;
}

/** An event attached to a span. */
export interface OtelSpanEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
}

/** A link between spans. */
export interface OtelSpanLink {
  trace_id: string;
  span_id: string;
  attributes?: Record<string, unknown>;
}

/** A log record. */
export interface OtelLog {
  timestamp: string;
  severity_text: string;
  severity_number?: number;
  body: string;
  service_name: string;
  trace_id?: string;
  span_id?: string;
  attributes?: Record<string, unknown>;
}

/** A metric data point. */
export interface OtelMetric {
  metric_name: string;
  service_name: string;
  value: number;
  unit?: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
  metric_type?: string;
}

/** Signal type for the Live view tabs. */
export type SignalType = 'traces' | 'logs' | 'metrics';

// ── Component Props ─────────────────────────────────────────────────

/** Props for the main OtelLive orchestrator component. */
export interface OtelLiveProps {
  /** OTEL API base URL (e.g. "http://localhost:9600"). Defaults to "". */
  baseUrl?: string;
  /** Bearer token for authentication. */
  token?: string;
  /** Auto-refresh interval in ms. Set to 0 to disable. Default 5000. */
  autoRefreshMs?: number;
  /** Default signal tab. */
  defaultSignal?: SignalType;
  /** Maximum rows to fetch per signal type. */
  limit?: number;
}

/** Props for the traces table. */
export interface OtelTracesListProps {
  spans: OtelSpan[];
  loading?: boolean;
  selectedSpanId?: string | null;
  onSelectSpan?: (span: OtelSpan) => void;
}

/** Props for the span detail panel. */
export interface OtelSpanDetailProps {
  span: OtelSpan | null;
  /** All spans of the same trace for building the tree. */
  traceSpans?: OtelSpan[];
  onClose?: () => void;
}

/** Props for the timeline bar chart. */
export interface OtelTimelineProps {
  /** All spans belonging to a single trace, sorted by start_time. */
  spans: OtelSpan[];
  /** Height per span bar in px. Default 22. */
  barHeight?: number;
  /** Optional selected span id. */
  selectedSpanId?: string | null;
  /** Called when user clicks a bar. */
  onSelectSpan?: (span: OtelSpan) => void;
}

/** Props for the span tree (nested view). */
export interface OtelSpanTreeProps {
  /** Root spans (with children pre-built). */
  spans: OtelSpan[];
  /** Currently selected span. */
  selectedSpanId?: string | null;
  /** Called when user selects a span node. */
  onSelectSpan?: (span: OtelSpan) => void;
  /** Default expanded depth. Default 2. */
  defaultExpandDepth?: number;
}

/** Props for the logs list view. */
export interface OtelLogsListProps {
  logs: OtelLog[];
  loading?: boolean;
  selectedLogIndex?: number | null;
  onSelectLog?: (log: OtelLog, index: number) => void;
}

/** Props for the metrics list view. */
export interface OtelMetricsListProps {
  metrics: OtelMetric[];
  loading?: boolean;
}

/** Props for the timeline range slider. */
export interface OtelTimelineRangeSliderProps {
  /** Timeline start (left edge). */
  timelineStart: Date;
  /** Timeline end (right edge). */
  timelineEnd: Date;
  /** Current selected range start. */
  selectedStart: Date;
  /** Current selected range end. */
  selectedEnd: Date;
  /** Called continuously while dragging. */
  onRangeChange: (start: Date, end: Date) => void;
  /** Called once when dragging ends. */
  onRangeCommit?: (start: Date, end: Date) => void;
  /** Number of tick marks. Default 8. */
  tickCount?: number;
  /** Format a Date into a tick label string. */
  formatTick?: (date: Date) => string;
  /** Height of the slider in px. Default 56. */
  height?: number;
  /** Optional histogram data: array of { time: Date; count: number } */
  histogram?: { time: Date; count: number }[];
}

/** Props for the search / filter bar. */
export interface OtelSearchBarProps {
  /** Current signal type. */
  signal: SignalType;
  onSignalChange: (signal: SignalType) => void;
  /** List of known service names for filter dropdown. */
  services: string[];
  /** Currently selected service filter (empty = all). */
  selectedService: string;
  onServiceChange: (service: string) => void;
  /** Search / filter query string. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Called when user clicks refresh. */
  onRefresh?: () => void;
  /** Whether data is currently loading. */
  loading?: boolean;
}
