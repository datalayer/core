/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelTimeline – Horizontal waterfall timeline for trace spans.
 *
 * Each span renders as a coloured bar positioned relative to the trace's
 * overall time window. Uses Primer React components for consistent theming.
 *
 * @module otel/OtelTimeline
 */

import React, { useMemo } from 'react';
import { Box, Text } from '@primer/react';
import type { OtelTimelineProps } from '../types';
import { toMs, formatDuration, serviceColor } from '../utils';

export const OtelTimeline: React.FC<OtelTimelineProps> = ({
  spans,
  barHeight = 24,
  selectedSpanId,
  onSelectSpan,
}) => {
  const { minTime, maxTime, sortedSpans } = useMemo(() => {
    if (spans.length === 0) return { minTime: 0, maxTime: 1, sortedSpans: [] };
    const sorted = [...spans].sort(
      (a, b) => toMs(a.start_time) - toMs(b.start_time),
    );
    let min = Infinity;
    let max = -Infinity;
    for (const s of sorted) {
      const start = toMs(s.start_time);
      const end = toMs(s.end_time);
      if (start < min) min = start;
      if (end > max) max = end;
    }
    return {
      minTime: min,
      maxTime: max || min + 1,
      sortedSpans: sorted,
    };
  }, [spans]);

  const totalDuration = maxTime - minTime || 1;

  if (sortedSpans.length === 0) {
    return (
      <Box sx={{ p: 3, color: 'fg.muted', textAlign: 'center' }}>
        <Text>No spans to display.</Text>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', py: 1 }}>
      {sortedSpans.map(span => {
        const startOffset =
          ((toMs(span.start_time) - minTime) / totalDuration) * 100;
        const width = Math.max(
          ((span.duration_ms || toMs(span.end_time) - toMs(span.start_time)) /
            totalDuration) *
            100,
          0.4,
        );
        const color = serviceColor(span.service_name);
        const isSelected = selectedSpanId === span.span_id;
        const indent = (span.depth ?? 0) * 16;

        return (
          <Box
            key={span.span_id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              height: barHeight,
              mb: '2px',
              cursor: 'pointer',
              bg: isSelected ? 'accent.subtle' : 'canvas.default',
              borderRadius: 1,
              ':hover': {
                bg: isSelected ? 'accent.subtle' : 'canvas.subtle',
              },
            }}
            onClick={() => onSelectSpan?.(span)}
            title={`${span.service_name} / ${span.span_name} — ${formatDuration(span.duration_ms)}`}
          >
            {/* Span name label */}
            <Text
              sx={{
                width: 200,
                minWidth: 200,
                pl: `${indent}px`,
                pr: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 1,
                fontFamily: 'mono',
                color: 'fg.muted',
              }}
            >
              {span.span_name}
            </Text>
            {/* Bar area */}
            <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: `${startOffset}%`,
                  width: `${width}%`,
                  height: barHeight - 6,
                  top: '3px',
                  bg: color,
                  borderRadius: 1,
                  opacity: isSelected ? 1 : 0.8,
                  border: isSelected ? '2px solid' : 'none',
                  borderColor: 'accent.emphasis',
                }}
              />
            </Box>
            {/* Duration */}
            <Text
              sx={{
                minWidth: 64,
                textAlign: 'right',
                pl: 1,
                fontSize: 0,
                fontFamily: 'mono',
                color: 'fg.muted',
              }}
            >
              {formatDuration(span.duration_ms)}
            </Text>
          </Box>
        );
      })}
      {/* Footer summary */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.default',
          mt: 2,
          pt: 2,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 0,
          color: 'fg.muted',
        }}
      >
        <Text>
          {sortedSpans.length} span{sortedSpans.length !== 1 ? 's' : ''}
        </Text>
        <Text sx={{ fontFamily: 'mono' }}>
          Total: {formatDuration(totalDuration)}
        </Text>
      </Box>
    </Box>
  );
};
