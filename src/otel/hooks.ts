/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * React hooks for fetching OTEL signals from the REST API.
 *
 * @module otel/hooks
 */

import { useCallback, useEffect, useState } from 'react';
import type { OtelSpan, OtelLog, OtelMetric } from './types';

/** Build auth headers from a token. */
function authHeaders(token?: string): Record<string, string> {
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
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
      setTraces(data.data ?? data ?? []);
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
        setSpans(data.data ?? data ?? []);
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
      setLogs(data.data ?? data ?? []);
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
      const resp = await fetch(
        `${baseUrl}/api/otel/v1/metrics/query?${params}`,
        {
          headers: authHeaders(token),
        },
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setMetrics(data.data ?? data ?? []);
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
      .then(data => setServices(data.services ?? data ?? []))
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
