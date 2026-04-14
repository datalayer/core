/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelClient – Typed HTTP client for the Datalayer OTEL service.
 *
 * Reads the OTEL service URL from the Datalayer core configuration by default,
 * so callers don't need to pass `baseUrl` unless they want to override it.
 *
 * @example
 * ```ts
 * import { createOtelClient } from '@datalayer/core/otel';
 *
 * const client = createOtelClient({ token: myJwt });
 * const { data: spans } = await client.fetchTraces({ limit: 50 });
 * ```
 */

import { coreStore } from '../../state/substates/CoreState';
import type { OtelSpan, OtelLog, OtelMetric, OtelQueryResult } from '../types';
import type {
  OtelSystemData,
  OtelSystemProcess,
  OtelSystemDisk,
  OtelSystemTable,
} from '../hooks';

// ── Fetch helper ────────────────────────────────────────────────────────────

async function otelFetch<T = unknown>(
  url: string,
  token?: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const resp = await fetch(url, {
    method: options?.method ?? 'GET',
    headers,
    body: options?.body != null ? JSON.stringify(options.body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OTEL API error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}

// ── Options / types ─────────────────────────────────────────────────────────

export interface OtelClientOptions {
  /**
   * Base URL of the OTEL service.
   * Defaults to `configuration.otelRunUrl` from the Datalayer core config
   * (i.e. `https://prod1.datalayer.run`).
   */
  baseUrl?: string;
  /** JWT bearer token or API key for authentication. */
  token?: string;
}

export interface FetchTracesOptions {
  serviceName?: string;
  limit?: number;
}

export interface FetchLogsOptions {
  serviceName?: string;
  severity?: string;
  traceId?: string;
  limit?: number;
}

export interface FetchMetricsOptions {
  serviceName?: string;
  metricName?: string;
  limit?: number;
}

export interface FetchMetricTotalOptions {
  serviceName?: string;
  limit?: number;
  fallbackWithoutService?: boolean;
}

function parseMetricValue(raw: Record<string, unknown>): number {
  const candidates = [raw.value, raw.value_double, raw.value_int];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function parseMetricTimestamp(raw: Record<string, unknown>): string {
  const candidate =
    raw.timestamp ??
    raw.Timestamp ??
    raw.timestamp_unix_nano ??
    raw.start_time_unix_nano;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  const numeric = Number(candidate);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  if (numeric > 1e15) {
    return new Date(numeric / 1e6).toISOString();
  }
  if (numeric > 1e12) {
    return new Date(numeric / 1e3).toISOString();
  }
  return new Date(numeric).toISOString();
}

function normalizeMetric(raw: Record<string, unknown>): OtelMetric {
  // Preserve the raw nanosecond timestamp for time-series charts.
  let timestampUnixNano: number | undefined;
  const rawNano = raw.timestamp_unix_nano;
  if (typeof rawNano === 'number' && rawNano > 0) {
    timestampUnixNano = rawNano;
  } else if (typeof rawNano === 'string') {
    const parsed = Number(rawNano);
    if (Number.isFinite(parsed) && parsed > 0) {
      timestampUnixNano = parsed;
    }
  }

  return {
    metric_name: String(
      raw.metric_name ?? raw.MetricName ?? raw.name ?? raw.Name ?? '',
    ),
    service_name: String(raw.service_name ?? raw.ServiceName ?? ''),
    value: parseMetricValue(raw),
    unit:
      raw.metric_unit != null
        ? String(raw.metric_unit)
        : raw.MetricUnit != null
          ? String(raw.MetricUnit)
          : raw.unit != null
            ? String(raw.unit)
            : raw.Unit != null
              ? String(raw.Unit)
              : undefined,
    timestamp: parseMetricTimestamp(raw),
    timestamp_unix_nano: timestampUnixNano,
    metric_type:
      raw.metric_type != null
        ? String(raw.metric_type)
        : raw.MetricType != null
          ? String(raw.MetricType)
          : undefined,
    attributes:
      typeof raw.attributes === 'object' && raw.attributes !== null
        ? (raw.attributes as Record<string, unknown>)
        : undefined,
  };
}

// ── OtelClient class ─────────────────────────────────────────────────────────

/**
 * Typed HTTP client for all OTEL service endpoints.
 *
 * Construct via `createOtelClient()` or `new OtelClient(options)`.
 */
export class OtelClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: OtelClientOptions = {}) {
    this.baseUrl =
      options.baseUrl ?? coreStore.getState().configuration.otelRunUrl;
    this.token = options.token;
  }

  // ── Traces ────────────────────────────────────────────────────────────────

  /** List recent spans / traces. */
  async fetchTraces(
    options: FetchTracesOptions = {},
  ): Promise<{ data: OtelSpan[]; count: number }> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 50) });
    if (options.serviceName) params.set('service_name', options.serviceName);
    const resp = await otelFetch<{ data?: OtelSpan[] } | OtelSpan[]>(
      `${this.baseUrl}/api/otel/v1/traces/?${params}`,
      this.token,
    );
    const rows = (Array.isArray(resp) ? resp : (resp as any).data) ?? [];
    return { data: rows, count: rows.length };
  }

  /** Fetch all spans for a single trace by `traceId`. */
  async fetchTrace(traceId: string): Promise<{ data: OtelSpan[] }> {
    const resp = await otelFetch<{ data?: OtelSpan[] } | OtelSpan[]>(
      `${this.baseUrl}/api/otel/v1/traces/${traceId}`,
      this.token,
    );
    const rows = (Array.isArray(resp) ? resp : (resp as any).data) ?? [];
    return { data: rows };
  }

  // ── Logs ──────────────────────────────────────────────────────────────────

  /** List recent log records. */
  async fetchLogs(
    options: FetchLogsOptions = {},
  ): Promise<{ data: OtelLog[]; count: number }> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 100) });
    if (options.serviceName) params.set('service_name', options.serviceName);
    if (options.severity) params.set('severity', options.severity);
    if (options.traceId) params.set('trace_id', options.traceId);
    const resp = await otelFetch<{ data?: OtelLog[] } | OtelLog[]>(
      `${this.baseUrl}/api/otel/v1/logs/?${params}`,
      this.token,
    );
    const rows = (Array.isArray(resp) ? resp : (resp as any).data) ?? [];
    return { data: rows, count: rows.length };
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  /** List recent metric data points. */
  async fetchMetrics(
    options: FetchMetricsOptions = {},
  ): Promise<{ data: OtelMetric[]; count: number }> {
    const params = new URLSearchParams({ limit: String(options.limit ?? 50) });
    if (options.serviceName) params.set('service_name', options.serviceName);
    if (options.metricName) params.set('metric_name', options.metricName);
    const resp = await otelFetch<{ data?: OtelMetric[] } | OtelMetric[]>(
      `${this.baseUrl}/api/otel/v1/metrics/?${params}`,
      this.token,
    );
    const rows = (Array.isArray(resp) ? resp : (resp as any).data) ?? [];
    const normalized = Array.isArray(rows)
      ? rows.map(row =>
          normalizeMetric(row as unknown as Record<string, unknown>),
        )
      : [];
    return { data: normalized, count: normalized.length };
  }

  /** Sum all values for one metric name, with optional service filter. */
  async fetchMetricTotal(
    metricName: string,
    options: FetchMetricTotalOptions = {},
  ): Promise<number> {
    const { serviceName, limit = 500, fallbackWithoutService = true } = options;
    const filtered = await this.fetchMetrics({
      metricName,
      serviceName,
      limit,
    });
    const filteredTotal = filtered.data.reduce(
      (sum, row) => sum + Number(row.value || 0),
      0,
    );
    if (filteredTotal > 0 || !serviceName || !fallbackWithoutService) {
      return filteredTotal;
    }

    const unfiltered = await this.fetchMetrics({ metricName, limit });
    return unfiltered.data.reduce(
      (sum, row) => sum + Number(row.value || 0),
      0,
    );
  }

  // ── Services ──────────────────────────────────────────────────────────────

  /** List known service names observed in traces. */
  async fetchServices(): Promise<string[]> {
    const resp = await otelFetch<
      | { services?: string[] }
      | { data?: Array<{ service_name: string }> }
      | string[]
    >(`${this.baseUrl}/api/otel/v1/traces/services/list`, this.token);
    if (Array.isArray(resp)) return resp as string[];
    const byServices = (resp as any).services;
    if (Array.isArray(byServices)) return byServices;
    const byData = (resp as any).data;
    if (Array.isArray(byData)) {
      return byData.map((r: Record<string, unknown>) =>
        String(r.service_name ?? r.name ?? ''),
      );
    }
    return [];
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /** Fetch storage / ingestion statistics. */
  async fetchStats(): Promise<Record<string, unknown>> {
    return otelFetch<Record<string, unknown>>(
      `${this.baseUrl}/api/otel/v1/stats/`,
      this.token,
    );
  }

  // ── SQL query ─────────────────────────────────────────────────────────────

  /**
   * Execute an ad-hoc DataFusion SQL query against the OTEL service.
   *
   * Available tables: `spans`, `logs`, `metrics`.
   */
  async executeQuery(sql: string): Promise<OtelQueryResult> {
    return otelFetch<OtelQueryResult>(
      `${this.baseUrl}/api/otel/v1/query/`,
      this.token,
      { method: 'POST', body: { sql } },
    );
  }

  // ── System ────────────────────────────────────────────────────────────────

  /**
   * Fetch system statistics (platform_admin only).
   *
   * Returns process memory/CPU, disk usage, and per-table row counts.
   */
  async fetchSystem(): Promise<OtelSystemData> {
    const resp = await otelFetch<{ data?: OtelSystemData } | OtelSystemData>(
      `${this.baseUrl}/api/otel/v1/system/`,
      this.token,
    );
    return ((resp as any).data ?? resp) as OtelSystemData;
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a new `OtelClient`.
 *
 * The `baseUrl` defaults to `configuration.otelRunUrl` from the Datalayer core
 * configuration store, so only pass it when you want to override the default.
 *
 * @example
 * ```ts
 * const client = createOtelClient({ token: jwt });
 * const services = await client.fetchServices();
 * ```
 */
export function createOtelClient(options: OtelClientOptions = {}): OtelClient {
  return new OtelClient(options);
}

// Re-export system data types for convenience.
export type {
  OtelSystemData,
  OtelSystemProcess,
  OtelSystemDisk,
  OtelSystemTable,
};
