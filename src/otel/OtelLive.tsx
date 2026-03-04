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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Text, Button } from '@primer/react';
import { GitBranchIcon, ClockIcon } from '@primer/octicons-react';
import type { OtelLiveProps, OtelSpan, OtelLog, SignalType } from './types';
import {
  useOtelTraces,
  useOtelTrace,
  useOtelLogs,
  useOtelMetrics,
  useOtelServices,
} from './hooks';
import { OtelSearchBar } from './OtelSearchBar';
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

// ── OtelLive ────────────────────────────────────────────────────────

export const OtelLive: React.FC<OtelLiveProps> = ({
  baseUrl = '',
  token,
  autoRefreshMs = 5000,
  defaultSignal = 'traces',
  limit = 200,
}) => {
  // ── state ──
  const [signal, setSignal] = useState<SignalType>(defaultSignal);
  const [service, setService] = useState('');
  const [query, setQuery] = useState('');
  const [selectedSpan, setSelectedSpan] = useState<OtelSpan | null>(null);
  const [selectedLogIdx, setSelectedLogIdx] = useState<number | null>(null);
  const [bottomPane, setBottomPane] = useState<BottomPane | null>(null);

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

  const toggleBottomPane = useCallback(
    (pane: BottomPane) => setBottomPane(cur => (cur === pane ? null : pane)),
    [],
  );

  const hasDetail =
    (signal === 'traces' && selectedSpan !== null) ||
    (signal === 'logs' && selectedLogIdx !== null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
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

      {/* ─── Main area (list + detail) ─── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: signal list */}
        <Box
          sx={{
            flex: hasDetail ? '0 0 55%' : '1 1 100%',
            overflow: 'auto',
          }}
        >
          {signal === 'traces' && (
            <OtelTracesList
              spans={filterSpans(traces ?? [], query)}
              loading={tracesLoading}
              selectedSpanId={selectedSpan?.span_id}
              onSelectSpan={handleSpanSelect}
            />
          )}
          {signal === 'logs' && (
            <OtelLogsList
              logs={filterLogs(logs ?? [], query)}
              loading={logsLoading}
              selectedLogIndex={selectedLogIdx}
              onSelectLog={handleLogSelect}
            />
          )}
          {signal === 'metrics' && (
            <OtelMetricsList metrics={metrics ?? []} loading={metricsLoading} />
          )}
        </Box>

        {/* Right: detail panel */}
        {hasDetail && (
          <Box
            sx={{
              flex: '0 0 45%',
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
