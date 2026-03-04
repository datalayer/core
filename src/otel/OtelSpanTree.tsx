/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSpanTree – Collapsible tree view of nested spans within a trace.
 *
 * Renders spans as an indented, expandable tree. Each node shows the span
 * name, duration bar, and can be selected. Supports deep nesting.
 *
 * @module otel/OtelSpanTree
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { OtelSpanTreeProps, OtelSpan } from './types';
import { formatDuration, serviceColor, toMs } from './utils';

interface SpanNodeProps {
  span: OtelSpan;
  depth: number;
  selectedSpanId?: string | null;
  onSelectSpan?: (span: OtelSpan) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  traceMinTime: number;
  traceDuration: number;
}

const INDENT_PX = 20;

const SpanNode: React.FC<SpanNodeProps> = ({
  span,
  depth,
  selectedSpanId,
  onSelectSpan,
  expandedIds,
  toggleExpanded,
  traceMinTime,
  traceDuration,
}) => {
  const hasChildren = (span.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(span.span_id);
  const isSelected = selectedSpanId === span.span_id;

  const color = serviceColor(span.service_name);
  const startPct =
    ((toMs(span.start_time) - traceMinTime) / traceDuration) * 100;
  const widthPct = Math.max(
    ((span.duration_ms || 0) / traceDuration) * 100,
    0.5,
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 28,
          paddingLeft: depth * INDENT_PX,
          paddingRight: 8,
          cursor: 'pointer',
          background: isSelected ? 'rgba(9,105,218,0.08)' : 'transparent',
          borderBottom: '1px solid #eaeef2',
          transition: 'background 0.1s',
        }}
        onClick={() => onSelectSpan?.(span)}
        onMouseEnter={e => {
          if (!isSelected) e.currentTarget.style.background = '#f6f8fa';
        }}
        onMouseLeave={e => {
          if (!isSelected) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Expand/collapse toggle */}
        <div
          style={{
            width: 20,
            textAlign: 'center',
            fontSize: 12,
            color: '#656d76',
            userSelect: 'none',
            flexShrink: 0,
          }}
          onClick={e => {
            e.stopPropagation();
            if (hasChildren) toggleExpanded(span.span_id);
          }}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : '·'}
        </div>

        {/* Service color dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            marginRight: 6,
          }}
        />

        {/* Name */}
        <div
          style={{
            flex: '0 0 200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12,
            fontWeight: isSelected ? 600 : 400,
          }}
          title={`${span.service_name} / ${span.span_name}`}
        >
          {span.span_name}
        </div>

        {/* Mini duration bar */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            height: 12,
            background: '#f6f8fa',
            borderRadius: 3,
            marginLeft: 8,
            marginRight: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${startPct}%`,
              width: `${widthPct}%`,
              height: '100%',
              background: color,
              borderRadius: 3,
              opacity: isSelected ? 1 : 0.7,
            }}
          />
        </div>

        {/* Duration text */}
        <div
          style={{
            minWidth: 60,
            textAlign: 'right',
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            color: '#656d76',
            flexShrink: 0,
          }}
        >
          {formatDuration(span.duration_ms)}
        </div>
      </div>

      {/* Children (recursive) */}
      {hasChildren &&
        isExpanded &&
        span.children!.map(child => (
          <SpanNode
            key={child.span_id}
            span={child}
            depth={depth + 1}
            selectedSpanId={selectedSpanId}
            onSelectSpan={onSelectSpan}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            traceMinTime={traceMinTime}
            traceDuration={traceDuration}
          />
        ))}
    </>
  );
};

export const OtelSpanTree: React.FC<OtelSpanTreeProps> = ({
  spans,
  selectedSpanId,
  onSelectSpan,
  defaultExpandDepth = 2,
}) => {
  // Pre-compute which IDs should be expanded by default
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    function walk(nodes: OtelSpan[], depth: number) {
      for (const n of nodes) {
        if (depth < defaultExpandDepth) {
          ids.add(n.span_id);
        }
        if (n.children) walk(n.children, depth + 1);
      }
    }
    walk(spans, 0);
    return ids;
  }, [spans, defaultExpandDepth]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(defaultExpanded);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Compute trace time bounds
  const { traceMinTime, traceDuration } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    function walk(nodes: OtelSpan[]) {
      for (const s of nodes) {
        const start = toMs(s.start_time);
        const end = toMs(s.end_time);
        if (start < min) min = start;
        if (end > max) max = end;
        if (s.children) walk(s.children);
      }
    }
    walk(spans);
    if (min === Infinity) return { traceMinTime: 0, traceDuration: 1 };
    return { traceMinTime: min, traceDuration: max - min || 1 };
  }, [spans]);

  if (spans.length === 0) {
    return (
      <div style={{ padding: 16, color: '#656d76', textAlign: 'center' }}>
        No span tree to display.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 28,
          padding: '0 8px',
          borderBottom: '2px solid #d0d7de',
          background: '#f6f8fa',
          fontSize: 11,
          fontWeight: 600,
          color: '#656d76',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        <div style={{ width: 20 }} />
        <div style={{ width: 8, marginRight: 6 }} />
        <div style={{ flex: '0 0 200px' }}>Span</div>
        <div style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>Timeline</div>
        <div style={{ minWidth: 60, textAlign: 'right' }}>Duration</div>
      </div>
      {spans.map(root => (
        <SpanNode
          key={root.span_id}
          span={root}
          depth={0}
          selectedSpanId={selectedSpanId}
          onSelectSpan={onSelectSpan}
          expandedIds={expandedIds}
          toggleExpanded={toggleExpanded}
          traceMinTime={traceMinTime}
          traceDuration={traceDuration}
        />
      ))}
    </div>
  );
};
