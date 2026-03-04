/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelTimeline – Horizontal waterfall timeline for trace spans.
 *
 * Each span renders as a coloured bar positioned relative to the trace's
 * overall time window. Clicking a bar fires `onSelectSpan`.
 * Supports tree-indented labels when spans carry a `depth` property.
 *
 * @module otel/OtelTimeline
 */

import React, { useMemo } from 'react';
import type { OtelTimelineProps } from './types';
import { toMs, formatDuration, serviceColor } from './utils';

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
      <div style={{ padding: 16, color: '#656d76', textAlign: 'center' }}>
        No spans to display.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '4px 0' }}>
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
          <div
            key={span.span_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: barHeight,
              marginBottom: 2,
              cursor: 'pointer',
              background: isSelected ? 'rgba(9,105,218,0.08)' : 'transparent',
              borderRadius: 4,
            }}
            onClick={() => onSelectSpan?.(span)}
            title={`${span.service_name} / ${span.span_name} — ${formatDuration(span.duration_ms)}`}
          >
            {/* Span name label */}
            <div
              style={{
                width: 200,
                minWidth: 200,
                paddingLeft: indent,
                paddingRight: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                color: '#656d76',
              }}
            >
              {span.span_name}
            </div>
            {/* Bar area */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                height: '100%',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${startOffset}%`,
                  width: `${width}%`,
                  height: barHeight - 6,
                  top: 3,
                  background: color,
                  borderRadius: 3,
                  opacity: isSelected ? 1 : 0.8,
                  transition: 'opacity 0.15s',
                  border: isSelected ? '2px solid rgba(9,105,218,0.6)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e =>
                  (e.currentTarget.style.opacity = isSelected ? '1' : '0.8')
                }
              />
            </div>
            {/* Duration */}
            <div
              style={{
                minWidth: 64,
                textAlign: 'right',
                paddingLeft: 4,
                fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                color: '#656d76',
              }}
            >
              {formatDuration(span.duration_ms)}
            </div>
          </div>
        );
      })}
      {/* Footer summary */}
      <div
        style={{
          borderTop: '1px solid #d0d7de',
          marginTop: 6,
          paddingTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#656d76',
        }}
      >
        <span>
          {sortedSpans.length} span{sortedSpans.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
          Total: {formatDuration(totalDuration)}
        </span>
      </div>
    </div>
  );
};
