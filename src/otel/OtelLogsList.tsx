/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelLogsList – Tabular log-records view with severity colour coding,
 * expandable body/attributes, and trace correlation links.
 *
 * @module otel/OtelLogsList
 */

import React, { useState } from 'react';
import type { OtelLogsListProps, OtelLog } from './types';
import { formatTime, severityColor } from './utils';

// ── helpers ─────────────────────────────────────────────────────────

/** Severity badge. */
const Severity: React.FC<{ text: string }> = ({ text }) => {
  const bg = severityColor(text);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 10,
        background: bg + '22',
        color: bg,
        textTransform: 'uppercase',
        lineHeight: '16px',
      }}
    >
      {text}
    </span>
  );
};

/** Expandable row detail for a single log record. */
const LogDetail: React.FC<{ log: OtelLog }> = ({ log }) => (
  <div
    style={{
      gridColumn: '1 / -1',
      background: '#f6f8fa',
      borderBottom: '1px solid #d0d7de',
      padding: '10px 14px',
    }}
  >
    {/* Body (potentially long) */}
    <div style={{ marginBottom: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#656d76',
          display: 'inline-block',
          marginBottom: 2,
        }}
      >
        Body
      </span>
      <pre
        style={{
          fontSize: 12,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
          background: '#ffffff',
          border: '1px solid #d0d7de',
          borderRadius: 6,
          padding: 8,
        }}
      >
        {log.body}
      </pre>
    </div>

    {/* Trace correlation */}
    {log.trace_id && (
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#656d76', fontWeight: 600 }}>
          trace_id
        </span>
        <span
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 11,
          }}
        >
          {log.trace_id}
        </span>
        {log.span_id && (
          <>
            <span style={{ fontSize: 11, color: '#656d76', fontWeight: 600 }}>
              span_id
            </span>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: 11,
              }}
            >
              {log.span_id}
            </span>
          </>
        )}
      </div>
    )}

    {/* Attributes */}
    {log.attributes && Object.keys(log.attributes).length > 0 && (
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#656d76',
            display: 'inline-block',
            marginBottom: 2,
          }}
        >
          Attributes
        </span>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #d0d7de',
            borderRadius: 6,
            padding: 8,
          }}
        >
          {Object.entries(log.attributes).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                gap: 8,
                padding: '2px 0',
                borderBottom: '1px solid #eaeef2',
              }}
            >
              <span
                style={{
                  color: '#0550ae',
                  fontSize: 11,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  minWidth: 150,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  wordBreak: 'break-word',
                }}
              >
                {typeof v === 'string' ? v : JSON.stringify(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ── Main component ──────────────────────────────────────────────────

export const OtelLogsList: React.FC<OtelLogsListProps> = ({
  logs,
  loading,
  selectedLogIndex,
  onSelectLog,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const colTemplate = '140px 80px 120px 1fr';

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: colTemplate,
          background: '#f6f8fa',
          borderBottom: '2px solid #d0d7de',
          padding: '6px 14px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {['Time', 'Severity', 'Service', 'Body'].map(h => (
          <span
            key={h}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#656d76',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {loading && logs.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#656d76' }}>
          Loading logs…
        </div>
      )}
      {!loading && logs.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#656d76' }}>
          No log records found.
        </div>
      )}

      {logs.map((log, idx) => {
        const selected = idx === selectedLogIndex;
        const expanded = idx === expandedIdx;
        return (
          <React.Fragment key={idx}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: colTemplate,
                padding: '5px 14px',
                borderBottom: '1px solid #eaeef2',
                cursor: 'pointer',
                background: selected
                  ? '#ddf4ff'
                  : expanded
                    ? '#f6f8fa'
                    : 'transparent',
                transition: 'background 120ms',
              }}
              onClick={() => {
                setExpandedIdx(expanded ? null : idx);
                onSelectLog?.(log, idx);
              }}
              onMouseEnter={e => {
                if (!selected && !expanded)
                  e.currentTarget.style.background = '#f6f8fa';
              }}
              onMouseLeave={e => {
                if (!selected && !expanded)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Time */}
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  color: '#1f2328',
                }}
              >
                {formatTime(log.timestamp)}
              </span>

              {/* Severity */}
              <Severity text={log.severity_text} />

              {/* Service */}
              <span
                style={{
                  fontSize: 12,
                  color: '#656d76',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {log.service_name}
              </span>

              {/* Body preview */}
              <span
                style={{
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {log.body}
              </span>
            </div>

            {/* Expanded detail */}
            {expanded && <LogDetail log={log} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
