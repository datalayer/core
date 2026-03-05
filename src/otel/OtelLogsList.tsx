/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelLogsList – Tabular log-records view with severity colour coding,
 * expandable body/attributes, and trace correlation links.
 *
 * Uses Primer React components for consistent theming.
 *
 * @module otel/OtelLogsList
 */

import React, { useState } from 'react';
import { Box, Text, Label, Spinner } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import { LogIcon } from '@primer/octicons-react';
import type { OtelLogsListProps, OtelLog } from './types';
import { formatTime, severityVariant } from './utils';

// ── helpers ─────────────────────────────────────────────────────────

/** Severity badge using Primer Label, centered in its grid cell. */
const Severity: React.FC<{ text: string }> = ({ text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Label size="small" variant={severityVariant(text)}>
      {text}
    </Label>
  </Box>
);

/** Expandable row detail for a single log record. */
const LogDetail: React.FC<{ log: OtelLog }> = ({ log }) => (
  <Box
    sx={{
      gridColumn: '1 / -1',
      bg: 'canvas.subtle',
      borderBottom: '1px solid',
      borderColor: 'border.default',
      p: 3,
    }}
  >
    {/* Body (potentially long) */}
    <Box sx={{ mb: 2 }}>
      <Text
        sx={{
          fontSize: 0,
          fontWeight: 'bold',
          color: 'fg.muted',
          display: 'block',
          mb: 1,
        }}
      >
        Body
      </Text>
      <Box
        as="pre"
        sx={{
          fontSize: 1,
          fontFamily: 'mono',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          m: 0,
          bg: 'canvas.default',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          p: 2,
        }}
      >
        {log.body}
      </Box>
    </Box>

    {/* Trace correlation */}
    {log.trace_id && (
      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Text sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'bold' }}>
          trace_id
        </Text>
        <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>{log.trace_id}</Text>
        {log.span_id && (
          <>
            <Text sx={{ fontSize: 0, color: 'fg.muted', fontWeight: 'bold' }}>
              span_id
            </Text>
            <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>{log.span_id}</Text>
          </>
        )}
      </Box>
    )}

    {/* Attributes */}
    {log.attributes && Object.keys(log.attributes).length > 0 && (
      <Box>
        <Text
          sx={{
            fontSize: 0,
            fontWeight: 'bold',
            color: 'fg.muted',
            display: 'block',
            mb: 1,
          }}
        >
          Attributes
        </Text>
        <Box
          sx={{
            bg: 'canvas.default',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            p: 2,
          }}
        >
          {Object.entries(log.attributes).map(([k, v]) => (
            <Box
              key={k}
              sx={{
                display: 'flex',
                gap: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'border.muted',
              }}
            >
              <Text
                sx={{
                  color: 'accent.fg',
                  fontSize: 0,
                  fontFamily: 'mono',
                  minWidth: 150,
                }}
              >
                {k}
              </Text>
              <Text
                sx={{
                  fontSize: 0,
                  fontFamily: 'mono',
                  wordBreak: 'break-word',
                }}
              >
                {typeof v === 'string' ? v : JSON.stringify(v)}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    )}
  </Box>
);

// ── Main component ──────────────────────────────────────────────────

export const OtelLogsList: React.FC<OtelLogsListProps> = ({
  logs,
  loading,
  selectedLogIndex,
  onSelectLog,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const colTemplate = '140px 80px 160px 1fr';

  if (loading && logs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <Spinner size="medium" />
      </Box>
    );
  }

  if (!loading && logs.length === 0) {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <LogIcon size={24} />
        </Blankslate.Visual>
        <Blankslate.Heading>No log records found</Blankslate.Heading>
        <Blankslate.Description>
          Send some log data first.
        </Blankslate.Description>
      </Blankslate>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: colTemplate,
          bg: 'canvas.subtle',
          borderBottom: '2px solid',
          borderColor: 'border.default',
          px: 3,
          py: 1,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {['Time', 'Severity', 'Service', 'Body'].map(h => (
          <Text
            key={h}
            sx={{
              fontSize: 0,
              fontWeight: 'bold',
              color: 'fg.muted',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: h === 'Severity' ? 'center' : undefined,
            }}
          >
            {h}
          </Text>
        ))}
      </Box>

      {/* Rows */}
      {logs.map((log, idx) => {
        const selected = idx === selectedLogIndex;
        const expanded = idx === expandedIdx;
        return (
          <React.Fragment key={idx}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: colTemplate,
                px: 3,
                py: '5px',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
                cursor: 'pointer',
                bg: selected
                  ? 'accent.subtle'
                  : expanded
                    ? 'canvas.subtle'
                    : 'canvas.default',
                ':hover': {
                  bg: selected || expanded ? undefined : 'canvas.subtle',
                },
              }}
              onClick={() => {
                setExpandedIdx(expanded ? null : idx);
                onSelectLog?.(log, idx);
              }}
            >
              {/* Time */}
              <Text
                sx={{ fontSize: 1, fontFamily: 'mono', color: 'fg.default' }}
              >
                {formatTime(log.timestamp)}
              </Text>

              {/* Severity */}
              <Severity text={log.severity_text} />

              {/* Service */}
              <Text
                sx={{
                  fontSize: 1,
                  color: 'fg.muted',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {log.service_name}
              </Text>

              {/* Body preview */}
              <Text
                sx={{
                  fontSize: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {log.body}
              </Text>
            </Box>

            {/* Expanded detail */}
            {expanded && <LogDetail log={log} />}
          </React.Fragment>
        );
      })}
    </Box>
  );
};
