/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelTracesList – Tabular list of spans with Time / Message / Scope / Duration
 * columns, resembling the Logfire Live trace list.
 *
 * @module otel/OtelTracesList
 */

import React from 'react';
import type { OtelTracesListProps } from './types';
import { formatDuration, formatTime, kindColor } from './utils';

export const OtelTracesList: React.FC<OtelTracesListProps> = ({
  spans,
  loading,
  selectedSpanId,
  onSelectSpan,
}) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#0969da"
            strokeWidth="3"
            fill="none"
            strokeDasharray="40 20"
          />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (spans.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          color: '#656d76',
          fontSize: 13,
        }}
      >
        No traces found. Send some telemetry data first.
      </div>
    );
  }

  const headerStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: '#656d76',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '8px 0',
    borderBottom: '2px solid #d0d7de',
    position: 'sticky' as const,
    top: 0,
    background: '#f6f8fa',
    zIndex: 1,
  };

  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 160px 90px',
          gap: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <div style={headerStyle}>Time</div>
        <div style={headerStyle}>Message</div>
        <div style={headerStyle}>Scope</div>
        <div style={{ ...headerStyle, textAlign: 'right' }}>Duration</div>
      </div>

      {/* Rows */}
      {spans.map(span => {
        const isSelected = selectedSpanId === span.span_id;
        return (
          <div
            key={span.span_id}
            onClick={() => onSelectSpan?.(span)}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 160px 90px',
              gap: 8,
              padding: '5px 12px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(9,105,218,0.08)' : 'transparent',
              borderBottom: '1px solid #eaeef2',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.background = '#f6f8fa';
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Time */}
            <div
              style={{
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                color: '#656d76',
                whiteSpace: 'nowrap',
                lineHeight: '22px',
              }}
            >
              {formatTime(span.start_time)}
            </div>

            {/* Message */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflow: 'hidden',
                lineHeight: '22px',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: kindColor(span.kind),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={span.span_name}
              >
                {span.span_name}
              </span>
              {span.status_code === 'ERROR' && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#cf222e',
                    border: '1px solid #cf222e',
                    borderRadius: 4,
                    padding: '0 4px',
                    lineHeight: '16px',
                  }}
                >
                  ERROR
                </span>
              )}
            </div>

            {/* Scope */}
            <div
              style={{
                fontSize: 12,
                color: '#656d76',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '22px',
              }}
              title={`${span.service_name} / ${span.otel_scope_name ?? ''}`}
            >
              {span.service_name}
            </div>

            {/* Duration */}
            <div
              style={{
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                textAlign: 'right',
                lineHeight: '22px',
                color:
                  span.duration_ms != null && span.duration_ms > 1000
                    ? '#cf222e'
                    : '#1f2328',
              }}
            >
              {formatDuration(span.duration_ms)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
