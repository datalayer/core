/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelLive – Full-featured observability dashboard that combines the
 * search bar, signal list, timeline, span tree, and detail panel into
 * a Logfire-inspired experience.
 *
 * Layout (top → bottom):
 *  ┌────────────────────────────────────────────────┐
 *  │  OtelSearchBar  (filters / signal tabs)        │
 *  ├──────────────────────────┬─────────────────────┤
 *  │  Signal list             │  Detail panel       │
 *  │  (Traces / Logs / …)     │  (SpanDetail or     │
 *  │                          │   LogDetail)        │
 *  ├──────────────────────────┴─────────────────────┤
 *  │  Timeline / SpanTree (expandable bottom pane)  │
 *  └────────────────────────────────────────────────┘
 *
 * @module otel/OtelLive
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { OtelLiveProps, OtelSpan, OtelLog, SignalType } from './types';
import {
  useOtelTraces,
  useOtelTrace,
  useOtelLogs,
  useOtelServices,
} from './hooks';
import { OtelSearchBar } from './OtelSearchBar';
import { OtelTracesList } from './OtelTracesList';
import { OtelLogsList } from './OtelLogsList';
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
  }, [signal, refetchTraces, refetchLogs]);

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#1f2328',
        background: '#ffffff',
        border: '1px solid #d0d7de',
        borderRadius: 8,
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
        loading={signal === 'traces' ? tracesLoading : logsLoading}
      />

      {/* ─── Main area (list + detail) ─── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: signal list */}
        <div
          style={{
            flex: hasDetail ? '0 0 55%' : '1 1 100%',
            overflow: 'auto',
            transition: 'flex 200ms ease',
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
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: '#656d76',
              }}
            >
              Metrics view coming soon.
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {hasDetail && (
          <div
            style={{
              flex: '0 0 45%',
              overflow: 'auto',
              borderLeft: '1px solid #d0d7de',
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
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    Log Detail
                  </span>
                  <span
                    style={{
                      cursor: 'pointer',
                      color: '#656d76',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                    onClick={handleCloseDetail}
                  >
                    ✕
                  </span>
                </div>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(logs[selectedLogIdx], null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom pane toggle bar ─── */}
      {signal === 'traces' && selectedSpan && spanTree.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '4px 12px',
              background: '#f6f8fa',
              borderTop: '1px solid #d0d7de',
              flexShrink: 0,
            }}
          >
            {BOTTOM_PANE_VIEWS.map(pane => {
              const active = bottomPane === pane;
              return (
                <button
                  key={pane}
                  onClick={() => toggleBottomPane(pane)}
                  style={{
                    padding: '3px 10px',
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    border: '1px solid',
                    borderColor: active ? '#0969da' : '#d0d7de',
                    borderRadius: 6,
                    background: active ? '#ddf4ff' : '#ffffff',
                    color: active ? '#0969da' : '#1f2328',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {pane === 'timeline' ? '⎇ Timeline' : '🌳 Span Tree'}
                </button>
              );
            })}
          </div>

          {/* Bottom pane content */}
          {bottomPane && (
            <div
              style={{
                height: 260,
                overflow: 'auto',
                borderTop: '1px solid #d0d7de',
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
            </div>
          )}
        </>
      )}
    </div>
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
