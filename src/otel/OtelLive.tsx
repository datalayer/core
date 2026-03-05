/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelLive – Full-featured observability dashboard that combines the
 * search bar, signal list, timeline, span tree, and detail panel into
 * a Logfire-inspired experience.
 *
 * Uses Primer React components for consistent theming.
 *
 * @module otel/OtelLive
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { Box, Text, Button, Label } from '@primer/react';
import { GitBranchIcon, ClockIcon } from '@primer/octicons-react';
import { coreStore } from '../state/substates/CoreState';
import type {
  OtelLiveProps,
  OtelSpan,
  OtelLog,
  OtelMetric,
  SignalType,
} from './types';
import {
  useOtelTraces,
  useOtelTrace,
  useOtelLogs,
  useOtelMetrics,
  useOtelServices,
  useOtelWebSocket,
} from './hooks';
import type { OtelWsCallbacks } from './hooks';
import { OtelSearchBar } from './OtelSearchBar';
import { OtelTimelineRangeSlider } from './OtelTimelineRangeSlider';
import { OtelTracesList } from './OtelTracesList';
import { OtelLogsList } from './OtelLogsList';
import { OtelMetricsList } from './OtelMetricsList';
import { OtelSpanDetail } from './OtelSpanDetail';
import { OtelTimeline } from './OtelTimeline';
import { OtelSpanTree } from './OtelSpanTree';
import { buildSpanTree } from './utils';

// ── Helpers ─────────────────────────────────────────────────────────

const BOTTOM_PANE_VIEWS = ['timeline', 'tree'] as const;
type BottomPane = (typeof BOTTOM_PANE_VIEWS)[number];

const HISTOGRAM_BUCKETS = 60;

/** Extract timestamp from any signal record. */
function signalTs(
  signal: SignalType,
  item: OtelSpan | OtelLog | OtelMetric,
): number {
  if (signal === 'traces')
    return new Date((item as OtelSpan).start_time).getTime();
  return new Date((item as OtelLog | OtelMetric).timestamp).getTime();
}

/** Build histogram buckets from a list of raw timestamps. */
function buildHistogram(
  timestamps: number[],
  start: number,
  end: number,
  buckets: number,
): { time: Date; count: number }[] {
  const range = end - start || 1;
  const step = range / buckets;
  const counts = new Array(buckets).fill(0) as number[];
  for (const ts of timestamps) {
    const idx = Math.min(Math.floor((ts - start) / step), buckets - 1);
    if (idx >= 0) counts[idx]++;
  }
  return counts.map((count, i) => ({
    time: new Date(start + i * step + step / 2),
    count,
  }));
}

// ── OtelLive ────────────────────────────────────────────────────────

export const OtelLive: React.FC<OtelLiveProps> = ({
  baseUrl = coreStore.getState().configuration.otelRunUrl,
  wsBaseUrl,
  token,
  autoRefreshMs = 5000,
  defaultSignal = 'traces',
  limit = 200,
  onSignalRef,
}) => {
  // ── state ──
  const [signal, setSignalState] = useState<SignalType>(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)otel_signal=([^;]+)/);
      if (match && ['traces', 'logs', 'metrics'].includes(match[1])) {
        return match[1] as SignalType;
      }
    } catch {
      // ignore
    }
    return defaultSignal;
  });

  const setSignal = (s: SignalType) => {
    try {
      document.cookie = `otel_signal=${s};path=/;max-age=31536000`;
    } catch {
      // ignore
    }
    setSignalState(s);
  };

  // Expose signal setter to parent so external controls (e.g. generate
  // buttons) can navigate to the right tab.
  useEffect(() => {
    onSignalRef?.(setSignal);
  }, [onSignalRef]);
  const [service, setService] = useState('');
  const [query, setQuery] = useState('');
  const [selectedSpan, setSelectedSpan] = useState<OtelSpan | null>(null);
  const [selectedLogIdx, setSelectedLogIdx] = useState<number | null>(null);
  const [bottomPane, setBottomPane] = useState<BottomPane | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  // Refs so the bounds-change effect can read current range without making
  // rangeStart/rangeEnd deps (which would cause infinite loops).
  const rangeStartRef = useRef<Date | null>(null);
  const rangeEndRef = useRef<Date | null>(null);
  rangeStartRef.current = rangeStart;
  rangeEndRef.current = rangeEnd;
  const prevBoundsRef = useRef<{ start: number; end: number } | null>(null);

  // ── data hooks ──
  const {
    traces,
    loading: tracesLoading,
    refetch: refetchTraces,
  } = useOtelTraces({
    baseUrl,
    token,
    limit,
    serviceName: service || undefined,
    autoRefreshMs,
  });

  const {
    logs,
    loading: logsLoading,
    refetch: refetchLogs,
  } = useOtelLogs({
    baseUrl,
    token,
    limit,
    serviceName: service || undefined,
    autoRefreshMs,
  });

  const {
    metrics,
    loading: metricsLoading,
    refetch: refetchMetrics,
  } = useOtelMetrics({
    baseUrl,
    token,
    limit,
    serviceName: service || undefined,
    autoRefreshMs,
  });

  const { services } = useOtelServices({ baseUrl, token });

  // ── WebSocket live updates ──
  // When a WS message arrives for a signal, refetch the corresponding hook
  // so the data stays fresh without polling.
  const wsCallbacks = useMemo<OtelWsCallbacks>(
    () => ({
      onTraces: () => void refetchTraces(),
      onLogs: () => void refetchLogs(),
      onMetrics: () => void refetchMetrics(),
    }),
    [refetchTraces, refetchLogs, refetchMetrics],
  );

  const { connected: wsConnected } = useOtelWebSocket({
    baseUrl: wsBaseUrl ?? baseUrl,
    token,
    callbacks: wsCallbacks,
  });

  // trace-detail fetch (when a span is selected)
  const { spans: traceSpans } = useOtelTrace({
    baseUrl,
    token,
    traceId: selectedSpan?.trace_id ?? '',
  });

  // Build tree from traceSpans for bottom pane
  const spanTree = useMemo(
    () =>
      traceSpans && traceSpans.length > 0 ? buildSpanTree(traceSpans) : [],
    [traceSpans],
  );

  // ── Timeline range slider data ──
  const allTimestamps = useMemo(() => {
    const ts: number[] = [];
    if (traces) for (const s of traces) ts.push(signalTs('traces', s));
    if (logs) for (const l of logs) ts.push(signalTs('logs', l));
    if (metrics) for (const m of metrics) ts.push(signalTs('metrics', m));
    // Drop invalid timestamps (NaN) so the slider doesn't collapse
    return ts.filter(t => Number.isFinite(t) && t > 0);
  }, [traces, logs, metrics]);

  const timelineBounds = useMemo(() => {
    if (allTimestamps.length === 0) return null;
    const min = Math.min(...allTimestamps);
    const max = Math.max(...allTimestamps);
    // Add a small padding (2 %) so edge items aren't clipped
    const pad = Math.max((max - min) * 0.02, 1000);
    return { start: new Date(min - pad), end: new Date(max + pad) };
  }, [allTimestamps]);

  const histogram = useMemo(() => {
    if (!timelineBounds || allTimestamps.length === 0) return undefined;
    return buildHistogram(
      allTimestamps,
      timelineBounds.start.getTime(),
      timelineBounds.end.getTime(),
      HISTOGRAM_BUCKETS,
    );
  }, [allTimestamps, timelineBounds]);

  // Auto-adapt slider range when data bounds change.
  // Behaviour:
  //  – First load (rangeStart is null): initialise to the full range.
  //  – Subsequent updates: if the user's range handle was at the previous
  //    bounds edge (within 600 ms), advance it to the new edge so the view
  //    "follows" live data.  If the handle was moved inward, leave it alone.
  useEffect(() => {
    if (!timelineBounds) return;
    const prev = prevBoundsRef.current;
    prevBoundsRef.current = {
      start: timelineBounds.start.getTime(),
      end: timelineBounds.end.getTime(),
    };

    // First load
    if (
      !prev ||
      rangeStartRef.current === null ||
      rangeEndRef.current === null
    ) {
      setRangeStart(timelineBounds.start);
      setRangeEnd(timelineBounds.end);
      return;
    }

    const STICKY_THRESHOLD = 600; // ms – how close to the edge counts as "at edge"
    if (rangeEndRef.current.getTime() >= prev.end - STICKY_THRESHOLD) {
      setRangeEnd(timelineBounds.end);
    }
    if (rangeStartRef.current.getTime() <= prev.start + STICKY_THRESHOLD) {
      setRangeStart(timelineBounds.start);
    }
  }, [timelineBounds?.start.getTime(), timelineBounds?.end.getTime()]);

  // Reset selection on signal change
  useEffect(() => {
    setSelectedSpan(null);
    setSelectedLogIdx(null);
    setBottomPane(null);
  }, [signal]);

  // ── handlers ──
  const handleRefresh = useCallback(() => {
    if (signal === 'traces') void refetchTraces();
    if (signal === 'logs') void refetchLogs();
    if (signal === 'metrics') void refetchMetrics();
  }, [signal, refetchTraces, refetchLogs, refetchMetrics]);

  const handleSpanSelect = useCallback((span: OtelSpan) => {
    setSelectedSpan(span);
    setSelectedLogIdx(null);
  }, []);

  const handleLogSelect = useCallback((log: OtelLog, idx: number) => {
    setSelectedLogIdx(idx);
    setSelectedSpan(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSpan(null);
    setSelectedLogIdx(null);
  }, []);

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setRangeStart(start);
    setRangeEnd(end);
  }, []);

  const toggleBottomPane = useCallback(
    (pane: BottomPane) => setBottomPane(cur => (cur === pane ? null : pane)),
    [],
  );

  const hasDetail =
    (signal === 'traces' && selectedSpan !== null) ||
    (signal === 'logs' && selectedLogIdx !== null);

  // ── Time-range-filtered data ──
  const isRangeActive =
    rangeStart !== null &&
    rangeEnd !== null &&
    timelineBounds !== null &&
    (rangeStart.getTime() > timelineBounds.start.getTime() + 100 ||
      rangeEnd.getTime() < timelineBounds.end.getTime() - 100);

  const filteredTraces = useMemo(() => {
    const list = filterSpans(traces ?? [], query);
    if (!isRangeActive || !rangeStart || !rangeEnd) return list;
    const s = rangeStart.getTime();
    const e = rangeEnd.getTime();
    return list.filter(t => {
      const ts = new Date(t.start_time).getTime();
      return ts >= s && ts <= e;
    });
  }, [traces, query, isRangeActive, rangeStart, rangeEnd]);

  const filteredLogs = useMemo(() => {
    const list = filterLogs(logs ?? [], query);
    if (!isRangeActive || !rangeStart || !rangeEnd) return list;
    const s = rangeStart.getTime();
    const e = rangeEnd.getTime();
    return list.filter(l => {
      const ts = new Date(l.timestamp).getTime();
      return ts >= s && ts <= e;
    });
  }, [logs, query, isRangeActive, rangeStart, rangeEnd]);

  const filteredMetrics = useMemo(() => {
    const list = metrics ?? [];
    if (!isRangeActive || !rangeStart || !rangeEnd) return list;
    const s = rangeStart.getTime();
    const e = rangeEnd.getTime();
    return list.filter(m => {
      const ts = new Date(m.timestamp).getTime();
      return ts >= s && ts <= e;
    });
  }, [metrics, isRangeActive, rangeStart, rangeEnd]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        color: 'fg.default',
        bg: 'canvas.default',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* ─── Search Bar ─── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <Box sx={{ flex: 1 }}>
          <OtelSearchBar
            signal={signal}
            onSignalChange={setSignal}
            services={services ?? []}
            selectedService={service}
            onServiceChange={setService}
            query={query}
            onQueryChange={setQuery}
            onRefresh={handleRefresh}
            loading={
              signal === 'traces'
                ? tracesLoading
                : signal === 'logs'
                  ? logsLoading
                  : metricsLoading
            }
          />
        </Box>
        {/* WebSocket status indicator */}
        <Box sx={{ pr: 2, flexShrink: 0 }}>
          <Label variant={wsConnected ? 'success' : 'secondary'} size="small">
            {wsConnected ? '● Live' : '○ Polling'}
          </Label>
        </Box>
      </Box>

      {/* ─── Timeline Range Slider ─── */}
      {timelineBounds && rangeStart && rangeEnd && (
        <Box
          sx={{
            px: 3,
            pt: 2,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'border.default',
            bg: 'canvas.subtle',
            flexShrink: 0,
            position: 'relative',
            zIndex: 0,
          }}
        >
          <OtelTimelineRangeSlider
            timelineStart={timelineBounds.start}
            timelineEnd={timelineBounds.end}
            selectedStart={rangeStart}
            selectedEnd={rangeEnd}
            onRangeChange={handleRangeChange}
            histogram={histogram}
            height={48}
            tickCount={6}
          />
        </Box>
      )}

      {/* ─── Main area (list + detail) ─── */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: signal list */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: hasDetail ? '0 0 55%' : '1 1 100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {signal === 'traces' && (
            <OtelTracesList
              spans={filteredTraces}
              loading={tracesLoading}
              selectedSpanId={selectedSpan?.span_id}
              onSelectSpan={handleSpanSelect}
            />
          )}
          {signal === 'logs' && (
            <OtelLogsList
              logs={filteredLogs}
              loading={logsLoading}
              selectedLogIndex={selectedLogIdx}
              onSelectLog={handleLogSelect}
            />
          )}
          {signal === 'metrics' && (
            <OtelMetricsList
              metrics={filteredMetrics}
              loading={metricsLoading}
            />
          )}
        </Box>

        {/* Right: detail panel */}
        {hasDetail && (
          <Box
            sx={{
              flex: '0 0 45%',
              minHeight: 0,
              overflow: 'auto',
              borderLeft: '1px solid',
              borderColor: 'border.default',
            }}
          >
            {signal === 'traces' && selectedSpan && (
              <OtelSpanDetail
                span={selectedSpan}
                traceSpans={traceSpans ?? undefined}
                onClose={handleCloseDetail}
              />
            )}
            {signal === 'logs' && selectedLogIdx !== null && logs && (
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 3,
                  }}
                >
                  <Text sx={{ fontWeight: 'bold', fontSize: 2 }}>
                    Log Detail
                  </Text>
                  <Button
                    size="small"
                    variant="invisible"
                    onClick={handleCloseDetail}
                  >
                    ✕
                  </Button>
                </Box>
                <Box
                  as="pre"
                  sx={{
                    m: 0,
                    fontSize: 1,
                    fontFamily: 'mono',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(logs[selectedLogIdx], null, 2)}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ─── Bottom pane toggle bar ─── */}
      {signal === 'traces' && selectedSpan && spanTree.length > 0 && (
        <>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              px: 3,
              py: 1,
              bg: 'canvas.subtle',
              borderTop: '1px solid',
              borderColor: 'border.default',
              flexShrink: 0,
            }}
          >
            <Button
              size="small"
              variant={bottomPane === 'timeline' ? 'primary' : 'invisible'}
              leadingVisual={ClockIcon}
              onClick={() => toggleBottomPane('timeline')}
            >
              Timeline
            </Button>
            <Button
              size="small"
              variant={bottomPane === 'tree' ? 'primary' : 'invisible'}
              leadingVisual={GitBranchIcon}
              onClick={() => toggleBottomPane('tree')}
            >
              Span Tree
            </Button>
          </Box>

          {/* Bottom pane content */}
          {bottomPane && (
            <Box
              sx={{
                height: 260,
                overflow: 'auto',
                borderTop: '1px solid',
                borderColor: 'border.default',
                flexShrink: 0,
              }}
            >
              {bottomPane === 'timeline' && (
                <OtelTimeline
                  spans={traceSpans ?? []}
                  selectedSpanId={selectedSpan?.span_id}
                  onSelectSpan={handleSpanSelect}
                />
              )}
              {bottomPane === 'tree' && (
                <OtelSpanTree
                  spans={spanTree}
                  selectedSpanId={selectedSpan?.span_id}
                  onSelectSpan={handleSpanSelect}
                  defaultExpandDepth={3}
                />
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

// ── Client-side filter helpers ──────────────────────────────────────

function filterSpans(spans: OtelSpan[], q: string): OtelSpan[] {
  if (!q.trim()) return spans;
  const lq = q.toLowerCase();
  return spans.filter(
    s =>
      s.span_name.toLowerCase().includes(lq) ||
      s.service_name.toLowerCase().includes(lq) ||
      (s.otel_scope_name ?? '').toLowerCase().includes(lq) ||
      (s.status_message ?? '').toLowerCase().includes(lq),
  );
}

function filterLogs(logs: OtelLog[], q: string): OtelLog[] {
  if (!q.trim()) return logs;
  const lq = q.toLowerCase();
  return logs.filter(
    l =>
      l.body.toLowerCase().includes(lq) ||
      l.service_name.toLowerCase().includes(lq) ||
      l.severity_text.toLowerCase().includes(lq),
  );
}
