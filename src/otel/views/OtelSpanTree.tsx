/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSpanTree – Collapsible tree view of nested spans within a trace.
 *
 * Renders spans as an indented, expandable tree with duration bars.
 * Uses Primer React components for consistent theming.
 *
 * @module otel/OtelSpanTree
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text } from '@primer/react';
import { ChevronDownIcon, ChevronRightIcon } from '@primer/octicons-react';
import type { OtelSpanTreeProps, OtelSpan } from '../types';
import { formatDuration, serviceColor, toMs } from '../utils';

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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 28,
          pl: `${depth * INDENT_PX}px`,
          pr: 2,
          cursor: 'pointer',
          bg: isSelected ? 'accent.subtle' : 'canvas.default',
          borderBottom: '1px solid',
          borderColor: 'border.muted',
          ':hover': {
            bg: isSelected ? 'accent.subtle' : 'canvas.subtle',
          },
        }}
        onClick={() => onSelectSpan?.(span)}
      >
        {/* Expand/collapse toggle */}
        <Box
          sx={{
            width: 20,
            textAlign: 'center',
            color: 'fg.muted',
            userSelect: 'none',
            flexShrink: 0,
            cursor: hasChildren ? 'pointer' : 'default',
          }}
          onClick={e => {
            e.stopPropagation();
            if (hasChildren) toggleExpanded(span.span_id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon size={12} />
            ) : (
              <ChevronRightIcon size={12} />
            )
          ) : (
            <Text sx={{ color: 'fg.subtle', fontSize: 0 }}>·</Text>
          )}
        </Box>

        {/* Service color dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bg: color,
            flexShrink: 0,
            mr: 1,
          }}
        />

        {/* Name */}
        <Text
          sx={{
            flex: '0 0 200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 1,
            fontWeight: isSelected ? 'bold' : 'normal',
          }}
          title={`${span.service_name} / ${span.span_name}`}
        >
          {span.span_name}
        </Text>

        {/* Mini duration bar */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            height: 12,
            bg: 'canvas.subtle',
            borderRadius: 1,
            mx: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: `${startPct}%`,
              width: `${widthPct}%`,
              height: '100%',
              bg: color,
              borderRadius: 1,
              opacity: isSelected ? 1 : 0.7,
            }}
          />
        </Box>

        {/* Duration text */}
        <Text
          sx={{
            minWidth: 60,
            textAlign: 'right',
            fontSize: 0,
            fontFamily: 'mono',
            color: 'fg.muted',
            flexShrink: 0,
          }}
        >
          {formatDuration(span.duration_ms)}
        </Text>
      </Box>

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
      <Box sx={{ p: 3, color: 'fg.muted', textAlign: 'center' }}>
        <Text>No span tree to display.</Text>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 28,
          px: 2,
          borderBottom: '2px solid',
          borderColor: 'border.default',
          bg: 'canvas.subtle',
        }}
      >
        <Box sx={{ width: 20 }} />
        <Box sx={{ width: 8, mr: 1 }} />
        <Text
          sx={{
            flex: '0 0 200px',
            fontSize: 0,
            fontWeight: 'bold',
            color: 'fg.muted',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Span
        </Text>
        <Text
          sx={{
            flex: 1,
            mx: 2,
            fontSize: 0,
            fontWeight: 'bold',
            color: 'fg.muted',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Timeline
        </Text>
        <Text
          sx={{
            minWidth: 60,
            textAlign: 'right',
            fontSize: 0,
            fontWeight: 'bold',
            color: 'fg.muted',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Duration
        </Text>
      </Box>
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
    </Box>
  );
};
