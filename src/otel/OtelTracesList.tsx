/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelTracesList – Tabular list of spans with Time / Message / Scope / Duration
 * columns, using Primer React components for consistent theming.
 *
 * @module otel/OtelTracesList
 */

import React from 'react';
import { Box, Text, Label, Spinner } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import { TelescopeIcon } from '@primer/octicons-react';
import type { OtelTracesListProps } from './types';
import { formatDuration, formatTime } from './utils';

export const OtelTracesList: React.FC<OtelTracesListProps> = ({
  spans,
  loading,
  selectedSpanId,
  onSelectSpan,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <Spinner size="medium" />
      </Box>
    );
  }

  if (spans.length === 0) {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <TelescopeIcon size={24} />
        </Blankslate.Visual>
        <Blankslate.Heading>No traces found</Blankslate.Heading>
        <Blankslate.Description>
          Send some telemetry data first.
        </Blankslate.Description>
      </Blankslate>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }}>
      {/* Header row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 160px 90px',
          gap: 2,
          px: 3,
          position: 'sticky',
          top: 0,
          bg: 'canvas.subtle',
          zIndex: 1,
          borderBottom: '2px solid',
          borderColor: 'border.default',
        }}
      >
        {['Time', 'Message', 'Scope', 'Duration'].map(h => (
          <Text
            key={h}
            sx={{
              fontWeight: 'bold',
              fontSize: 0,
              color: 'fg.muted',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              py: 2,
              ...(h === 'Duration' ? { textAlign: 'right' } : {}),
            }}
          >
            {h}
          </Text>
        ))}
      </Box>

      {/* Rows */}
      {spans.map((span, idx) => {
        const isSelected = selectedSpanId === span.span_id;
        return (
          <Box
            key={`${span.trace_id}-${span.span_id}-${idx}`}
            onClick={() => onSelectSpan?.(span)}
            sx={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 160px 90px',
              gap: 2,
              px: 3,
              py: '5px',
              cursor: 'pointer',
              bg: isSelected ? 'accent.subtle' : 'canvas.default',
              borderBottom: '1px solid',
              borderColor: 'border.muted',
              ':hover': {
                bg: isSelected ? 'accent.subtle' : 'canvas.subtle',
              },
            }}
          >
            {/* Time */}
            <Text
              sx={{
                fontSize: 1,
                fontFamily: 'mono',
                color: 'fg.muted',
                whiteSpace: 'nowrap',
                lineHeight: '22px',
              }}
            >
              {formatTime(span.start_time)}
            </Text>

            {/* Message */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflow: 'hidden',
                lineHeight: '22px',
              }}
            >
              <Text
                sx={{
                  fontSize: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={span.span_name}
              >
                {span.span_name}
              </Text>
              {span.status_code === 'ERROR' && (
                <Label variant="danger" size="small">
                  ERROR
                </Label>
              )}
            </Box>

            {/* Scope */}
            <Text
              sx={{
                fontSize: 1,
                color: 'fg.muted',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '22px',
              }}
              title={`${span.service_name} / ${span.otel_scope_name ?? ''}`}
            >
              {span.service_name}
            </Text>

            {/* Duration */}
            <Text
              sx={{
                fontSize: 1,
                fontFamily: 'mono',
                textAlign: 'right',
                lineHeight: '22px',
                color:
                  span.duration_ms != null && span.duration_ms > 1000
                    ? 'danger.fg'
                    : 'fg.default',
              }}
            >
              {formatDuration(span.duration_ms)}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
