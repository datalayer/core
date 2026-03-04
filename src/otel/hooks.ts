/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * React hooks for fetching OTEL signals from the REST API.
 *
 * @module otel/hooks
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OtelSpan, OtelLog, OtelMetric, SignalType } from './types';

/** Build auth headers from a token. */
function authHeaders(token?: string): Record<string, string> {
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/** Convert nanosecond epoch to ISO string. Returns the input if already a string. */
function nanoToIso(val: unknown): string {
  if (typeof val === 'string' && val.length > 0) {
    // Already a date string — use as-is.
    return val;
  }
  const n = Number(val);
  if (!isNaN(n) && n > 1e15) {
    // Nanosecond epoch → milliseconds.
    return new Date(n / 1e6).toISOString();
  }
  if (!isNaN(n) && n > 1e12) {
    // Microsecond epoch.
    return new Date(n / 1e3).toISOString();
  }
  if (!isNaN(n) && n > 0) {
    // Millisecond epoch.
    return new Date(n).toISOString();
  }
  return String(val ?? '');
}

/** Normalise a raw API span row into the OtelSpan shape components expect. */
function normalizeSpan(raw: Record<string, unknown>): OtelSpan {
  return {
    trace_id: String(raw.trace_id ?? raw.TraceId ?? ''),
    span_id: String(
      raw.span_id ?? raw.SpanId ?? raw.trace_id ?? raw.TraceId ?? '',
    ),
    parent_span_id:
      (raw.parent_span_id ?? raw.ParentSpanId)
        ? String(raw.parent_span_id ?? raw.ParentSpanId)
        : undefined,
    span_name: String(
      raw.span_name ?? raw.SpanName ?? raw.operation_name ?? raw.name ?? '',
    ),
    service_name: String(raw.service_name ?? raw.ServiceName ?? ''),
    kind: String(raw.kind ?? raw.SpanKind ?? raw.span_kind ?? 'INTERNAL'),
    start_time: nanoToIso(
      raw.start_time ?? raw.Timestamp ?? raw.start_time_unix_nano,
    ),
    end_time: nanoToIso(raw.end_time ?? raw.end_time_unix_nano),
    duration_ms:
      raw.duration_ms != null
        ? Number(raw.duration_ms)
        : raw.Duration != null
          ? Number(raw.Duration) / 1e6
          : raw.duration_ns != null
            ? Number(raw.duration_ns) / 1e6
            : 0,
    status_code: raw.status_code ? String(raw.status_code) : undefined,
    status_message: raw.status_message ? String(raw.status_message) : undefined,
    otel_scope_name: raw.otel_scope_name
      ? String(raw.otel_scope_name)
      : undefined,
    attributes:
      typeof raw.attributes === 'object' && raw.attributes !== null
        ? (raw.attributes as Record<string, unknown>)
        : typeof raw.attributes === 'string'
          ? (() => {
              try {
                return JSON.parse(raw.attributes as string);
              } catch {
                return undefined;
              }
            })()
          : undefined,
  };
}

/** Normalise a raw API log row into the OtelLog shape components expect. */
function normalizeLog(raw: Record<string, unknown>): OtelLog {
  return {
    timestamp: nanoToIso(
      raw.timestamp ?? raw.Timestamp ?? raw.timestamp_unix_nano,
    ),
    severity_text: String(raw.severity_text ?? raw.SeverityText ?? ''),
    severity_number:
      (raw.severity_number ?? raw.SeverityNumber) != null
        ? Number(raw.severity_number ?? raw.SeverityNumber)
        : undefined,
    body: String(raw.body ?? raw.Body ?? ''),
    service_name: String(raw.service_name ?? raw.ServiceName ?? ''),
    trace_id:
      (raw.trace_id ?? raw.TraceId)
        ? String(raw.trace_id ?? raw.TraceId)
        : undefined,
    span_id:
      (raw.span_id ?? raw.SpanId)
        ? String(raw.span_id ?? raw.SpanId)
        : undefined,
    attributes:
      typeof raw.attributes === 'object' && raw.attributes !== null
        ? (raw.attributes as Record<string, unknown>)
        : typeof raw.attributes === 'string'
          ? (() => {
              try {
                return JSON.parse(raw.attributes as string);
              } catch {
                return undefined;
              }
            })()
          : undefined,
  };
}

/** Normalise a raw API metric row into the OtelMetric shape components expect. */
function normalizeMetric(raw: Record<string, unknown>): OtelMetric {
  return {
    metric_name: String(
      raw.metric_name ?? raw.MetricName ?? raw.name ?? raw.Name ?? '',
    ),
    service_name: String(raw.service_name ?? raw.ServiceName ?? ''),
    value: Number(
      raw.value ?? raw.Value ?? raw.value_double ?? raw.value_int ?? 0,
    ),
    unit:
      (raw.metric_unit ?? raw.MetricUnit)
        ? String(raw.metric_unit ?? raw.MetricUnit)
        : (raw.unit ?? raw.Unit)
          ? String(raw.unit ?? raw.Unit)
          : undefined,
    timestamp: nanoToIso(
      raw.timestamp ??
        raw.Timestamp ??
        raw.timestamp_unix_nano ??
        raw.start_time_unix_nano,
    ),
    metric_type:
      (raw.metric_type ?? raw.MetricType)
        ? String(raw.metric_type ?? raw.MetricType)
        : undefined,
    attributes:
      typeof raw.attributes === 'object' && raw.attributes !== null
        ? (raw.attributes as Record<string, unknown>)
        : typeof raw.attributes === 'string'
          ? (() => {
              try {
                return JSON.parse(raw.attributes as string);
              } catch {
                return undefined;
              }
            })()
          : undefined,
  };
}

// ── useOtelTraces ───────────────────────────────────────────────────

/** Fetch a list of traces / spans from the OTEL service. */
export function useOtelTraces(options: {
  token?: string;
  baseUrl?: string;
  serviceName?: string;
  limit?: number;
  autoRefreshMs?: number;
}) {
  const {
    token,
    baseUrl = '',
    serviceName,
    limit = 50,
    autoRefreshMs,
  } = options;
  const [traces, setTraces] = useState<OtelSpan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (serviceName) params.set('service_name', serviceName);
      const resp = await fetch(`${baseUrl}/api/otel/v1/traces?${params}`, {
        headers: authHeaders(token),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const rows = data.data ?? data ?? [];
      setTraces(Array.isArray(rows) ? rows.map(normalizeSpan) : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, baseUrl, serviceName, limit]);

  useEffect(() => {
    fetchTraces();
    if (autoRefreshMs && autoRefreshMs > 0) {
      const id = setInterval(fetchTraces, autoRefreshMs);
      return () => clearInterval(id);
    }
  }, [fetchTraces, autoRefreshMs]);

  return { traces, loading, error, refetch: fetchTraces };
}

// ── useOtelTrace ────────────────────────────────────────────────────

/** Fetch all spans for a single trace. */
export function useOtelTrace(options: {
  traceId: string | null;
  token?: string;
  baseUrl?: string;
}) {
  const { traceId, token, baseUrl = '' } = options;
  const [spans, setSpans] = useState<OtelSpan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) {
      setSpans([]);
      return;
    }
    setLoading(true);
    fetch(`${baseUrl}/api/otel/v1/traces/${traceId}`, {
      headers: authHeaders(token),
    })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(data => {
        const rows = data.data ?? data ?? [];
        setSpans(Array.isArray(rows) ? rows.map(normalizeSpan) : []);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [traceId, token, baseUrl]);

  return { spans, loading, error };
}

// ── useOtelLogs ─────────────────────────────────────────────────────

/** Fetch log records from the OTEL service. */
export function useOtelLogs(options: {
  token?: string;
  baseUrl?: string;
  serviceName?: string;
  severity?: string;
  traceId?: string;
  limit?: number;
  autoRefreshMs?: number;
}) {
  const {
    token,
    baseUrl = '',
    serviceName,
    severity,
    traceId,
    limit = 100,
    autoRefreshMs,
  } = options;
  const [logs, setLogs] = useState<OtelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (serviceName) params.set('service_name', serviceName);
      if (severity) params.set('severity', severity);
      if (traceId) params.set('trace_id', traceId);
      const resp = await fetch(`${baseUrl}/api/otel/v1/logs?${params}`, {
        headers: authHeaders(token),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const rows = data.data ?? data ?? [];
      setLogs(Array.isArray(rows) ? rows.map(normalizeLog) : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, baseUrl, serviceName, severity, traceId, limit]);

  useEffect(() => {
    fetchLogs();
    if (autoRefreshMs && autoRefreshMs > 0) {
      const id = setInterval(fetchLogs, autoRefreshMs);
      return () => clearInterval(id);
    }
  }, [fetchLogs, autoRefreshMs]);

  return { logs, loading, error, refetch: fetchLogs };
}

// ── useOtelMetrics ──────────────────────────────────────────────────

/** Fetch metrics from the OTEL service. */
export function useOtelMetrics(options: {
  token?: string;
  baseUrl?: string;
  serviceName?: string;
  metricName?: string;
  limit?: number;
  autoRefreshMs?: number;
}) {
  const {
    token,
    baseUrl = '',
    serviceName,
    metricName,
    limit = 50,
    autoRefreshMs,
  } = options;
  const [metrics, setMetrics] = useState<OtelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (serviceName) params.set('service_name', serviceName);
      if (metricName) params.set('name', metricName);
      const resp = await fetch(`${baseUrl}/api/otel/v1/metrics?${params}`, {
        headers: authHeaders(token),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const rows = data.data ?? data ?? [];
      setMetrics(Array.isArray(rows) ? rows.map(normalizeMetric) : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, baseUrl, serviceName, metricName, limit]);

  useEffect(() => {
    fetchMetrics();
    if (autoRefreshMs && autoRefreshMs > 0) {
      const id = setInterval(fetchMetrics, autoRefreshMs);
      return () => clearInterval(id);
    }
  }, [fetchMetrics, autoRefreshMs]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

// ── useOtelServices ─────────────────────────────────────────────────

/** Fetch list of observed service names. */
export function useOtelServices(options: { token?: string; baseUrl?: string }) {
  const { token, baseUrl = '' } = options;
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl}/api/otel/v1/traces/services/list`, {
      headers: authHeaders(token),
    })
      .then(resp => resp.json())
      .then(data => {
        // Handle various response shapes:
        // { services: ["a","b"] } | { data: [{service_name:"a"},...] } | ["a","b"]
        let raw: unknown = data.services ?? data.data ?? data;
        if (
          Array.isArray(raw) &&
          raw.length > 0 &&
          typeof raw[0] === 'object' &&
          raw[0] !== null
        ) {
          raw = (raw as Array<Record<string, unknown>>).map(
            r => (r.service_name ?? r.name ?? '') as string,
          );
        }
        setServices(Array.isArray(raw) ? (raw as string[]) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, baseUrl]);

  return { services, loading };
}

// ── useOtelStats ────────────────────────────────────────────────────

/** Fetch storage stats from the OTEL service. */
export function useOtelStats(options: { token?: string; baseUrl?: string }) {
  const { token, baseUrl = '' } = options;
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl}/api/otel/v1/stats`, {
      headers: authHeaders(token),
    })
      .then(resp => resp.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, baseUrl]);

  return { stats, loading };
}

// ── useOtelWebSocket ────────────────────────────────────────────────

/** WebSocket message shape sent by the OTEL service. */
export interface OtelWsMessage {
  signal: 'traces' | 'logs' | 'metrics';
  data: Record<string, unknown>[];
  count: number;
}

/** Callbacks for WebSocket lifecycle events. */
export interface OtelWsCallbacks {
  /** Called when new traces are flushed. */
  onTraces?: (spans: OtelSpan[]) => void;
  /** Called when new logs are flushed. */
  onLogs?: (logs: OtelLog[]) => void;
  /** Called when new metrics are flushed. */
  onMetrics?: (metrics: OtelMetric[]) => void;
  /** Called on any message (raw). */
  onMessage?: (msg: OtelWsMessage) => void;
  /** Called when connection opens. */
  onOpen?: () => void;
  /** Called when connection closes. */
  onClose?: (event: CloseEvent) => void;
  /** Called on error. */
  onError?: (event: Event) => void;
}

/**
 * Connect to the OTEL service WebSocket for live telemetry streaming.
 *
 * The server pushes JSON messages whenever new data is flushed to storage.
 * Authentication is via the `token` query parameter (JWT or API key).
 *
 * @returns `{ connected, error, close }` – reactive connection state.
 */
export function useOtelWebSocket(options: {
  /** OTEL service base URL (e.g. `http://localhost:7800`). */
  baseUrl?: string;
  /** JWT token or API key for authentication. */
  token?: string;
  /** Whether to automatically reconnect on disconnect. Default true. */
  autoReconnect?: boolean;
  /** Reconnect delay in ms. Default 3000. */
  reconnectDelayMs?: number;
  /** Callbacks for signal events. */
  callbacks?: OtelWsCallbacks;
}) {
  const {
    baseUrl = '',
    token,
    autoReconnect = true,
    reconnectDelayMs = 3000,
    callbacks,
  } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store callbacks in a ref so we don't reconnect when they change.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const close = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    // Derive ws(s):// URL from http(s):// baseUrl.
    let wsUrl: string;
    if (baseUrl.startsWith('http://')) {
      wsUrl = `ws://${baseUrl.slice(7)}`;
    } else if (baseUrl.startsWith('https://')) {
      wsUrl = `wss://${baseUrl.slice(8)}`;
    } else if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
      wsUrl = baseUrl;
    } else {
      // Relative URL – use current page's protocol.
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${window.location.host}${baseUrl}`;
    }
    wsUrl = `${wsUrl.replace(/\/$/, '')}/api/otel/v1/ws?token=${encodeURIComponent(token)}`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        cbRef.current?.onOpen?.();
      };

      ws.onmessage = event => {
        try {
          const msg: OtelWsMessage = JSON.parse(event.data);
          cbRef.current?.onMessage?.(msg);
          if (msg.signal === 'traces' && cbRef.current?.onTraces) {
            cbRef.current.onTraces(
              Array.isArray(msg.data) ? msg.data.map(normalizeSpan) : [],
            );
          }
          if (msg.signal === 'logs' && cbRef.current?.onLogs) {
            cbRef.current.onLogs(
              Array.isArray(msg.data) ? msg.data.map(normalizeLog) : [],
            );
          }
          if (msg.signal === 'metrics' && cbRef.current?.onMetrics) {
            cbRef.current.onMetrics(
              Array.isArray(msg.data) ? msg.data.map(normalizeMetric) : [],
            );
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      ws.onclose = event => {
        setConnected(false);
        cbRef.current?.onClose?.(event);
        if (autoReconnect && event.code !== 1008) {
          // 1008 = policy violation (auth failure) – don't retry.
          reconnectTimerRef.current = setTimeout(connect, reconnectDelayMs);
        }
      };

      ws.onerror = event => {
        setError('WebSocket error');
        cbRef.current?.onError?.(event);
      };
    }

    connect();

    return () => {
      // Disable auto-reconnect during teardown.
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [baseUrl, token, autoReconnect, reconnectDelayMs]);

  return { connected, error, close };
}
