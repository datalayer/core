/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TypeScript DTOs for the OTEL API.
 *
 * @module api/otel/types
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

/** Response from list traces endpoint. */
export interface ListTracesResponse {
  data: OtelSpan[];
  total?: number;
}

/** Response from get single trace endpoint. */
export interface GetTraceResponse {
  data: OtelSpan[];
  trace_id: string;
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

/** Response from list/query metrics endpoint. */
export interface ListMetricsResponse {
  data: OtelMetric[];
  total?: number;
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

/** Response from query logs endpoint. */
export interface ListLogsResponse {
  data: OtelLog[];
  total?: number;
}

/** Storage statistics. */
export interface OtelStats {
  spans_count?: number;
  metrics_count?: number;
  logs_count?: number;
  spans_files?: number;
  metrics_files?: number;
  logs_files?: number;
  data_dir?: string;
  [key: string]: unknown;
}

/** Response from SQL query endpoint. */
export interface QueryResponse {
  data: Record<string, unknown>[];
  columns?: string[];
  row_count?: number;
}

/** Ping/health response. */
export interface PingResponse {
  status: string;
  [key: string]: unknown;
}

/** Version response. */
export interface VersionResponse {
  version: string;
  [key: string]: unknown;
}

/** Flush response. */
export interface FlushResponse {
  flushed: boolean;
  [key: string]: unknown;
}

/** List services response. */
export interface ListServicesResponse {
  services: string[];
}
