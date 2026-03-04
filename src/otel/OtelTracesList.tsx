/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelTracesList – Tabular list of spans with Time / Message / Scope / Duration
 * columns, using Primer React components for consistent theming.
 *
 * Spans that share the same trace_id are grouped into collapsible trees:
 * only root spans are shown initially; clicking a row with children
 * expands / collapses the nested child rows (shown indented).
 *
 * @module otel/OtelTracesList
 */

import React, { useMemo, useCallback, useState } from 'react';
import { Box, Text, Label, Spinner } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import {
  TelescopeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@primer/octicons-react';
import type { OtelTracesListProps, OtelSpan } from './types';
import { formatDuration, formatTime, buildSpanTree } from './utils';

/** A row in the rendered list – carries the tree depth for indentation. */
interface SpanRow {
  span: OtelSpan;
  depth: number;
  hasChildren: boolean;
}

const GRID_COLS = '140px 1fr 160px 90px';

// ── Helpers ─────────────────────────────────────────────────────────

/** Extract gen_ai token counts from span attributes. */
function getTokenUsage(span: OtelSpan): {
  input?: number;
  output?: number;
} | null {
  const attrs = span.attributes;
  if (!attrs) return null;
  const input =
    attrs['gen_ai.usage.input_tokens'] != null
      ? Number(attrs['gen_ai.usage.input_tokens'])
      : undefined;
  const output =
    attrs['gen_ai.usage.output_tokens'] != null
      ? Number(attrs['gen_ai.usage.output_tokens'])
      : undefined;
  if (input == null && output == null) return null;
  return { input, output };
}

export const OtelTracesList: React.FC<OtelTracesListProps> = ({
  spans,
  loading,
  selectedSpanId,
  onSelectSpan,
}) => {
  // Set of expanded span_ids (show their children)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Build the span tree from flat input
  const roots = useMemo(() => buildSpanTree(spans), [spans]);

  // Flatten visible rows based on which nodes are expanded
  const visibleRows = useMemo(() => {
    const rows: SpanRow[] = [];
    function walk(node: OtelSpan, depth: number) {
      const children = node.children ?? [];
      rows.push({ span: node, depth, hasChildren: children.length > 0 });
      if (expanded.has(node.span_id)) {
        for (const child of children) {
          walk(child, depth + 1);
        }
      }
    }
    for (const root of roots) {
      walk(root, 0);
    }
    return rows;
  }, [roots, expanded]);

  const toggleExpand = useCallback((spanId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(spanId)) {
        next.delete(spanId);
      } else {
        next.add(spanId);
      }
      return next;
    });
  }, []);

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
          gridTemplateColumns: GRID_COLS,
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
      {visibleRows.map(({ span, depth, hasChildren }, idx) => {
        const isSelected = selectedSpanId === span.span_id;
        const isExpanded = expanded.has(span.span_id);
        const indent = depth * 20;
        return (
          <Box
            key={`${span.trace_id}-${span.span_id}-${idx}`}
            onClick={() => {
              if (hasChildren) {
                toggleExpand(span.span_id);
              }
              onSelectSpan?.(span);
            }}
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              gap: 2,
              px: 3,
              py: '5px',
              cursor: 'pointer',
              bg: isSelected
                ? 'accent.subtle'
                : depth > 0
                  ? 'canvas.inset'
                  : 'canvas.default',
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

            {/* Message (with indent + expand chevron) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflow: 'hidden',
                lineHeight: '22px',
                pl: `${indent}px`,
              }}
            >
              {/* Expand/collapse chevron for spans with children */}
              {hasChildren ? (
                <Box
                  sx={{
                    flexShrink: 0,
                    color: 'fg.muted',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {isExpanded ? (
                    <ChevronDownIcon size={14} />
                  ) : (
                    <ChevronRightIcon size={14} />
                  )}
                </Box>
              ) : depth > 0 ? (
                /* Connector dash for child leaves */
                <Box
                  sx={{
                    flexShrink: 0,
                    width: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'fg.subtle',
                    fontSize: 0,
                  }}
                >
                  ─
                </Box>
              ) : null}
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
              {/* Token usage badges for AI spans */}
              {(() => {
                const usage = getTokenUsage(span);
                if (!usage) return null;
                return (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      border: '1px solid',
                      borderColor: 'border.default',
                      borderRadius: 2,
                      px: 1,
                      fontSize: '10px',
                      fontFamily: 'mono',
                      color: 'fg.muted',
                      flexShrink: 0,
                      lineHeight: '16px',
                    }}
                  >
                    {usage.input != null && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '1px',
                        }}
                      >
                        <Text sx={{ fontSize: '9px', color: 'fg.subtle' }}>
                          ↗
                        </Text>
                        <Text>{usage.input}</Text>
                      </Box>
                    )}
                    {usage.output != null && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '1px',
                        }}
                      >
                        <Text sx={{ fontSize: '9px', color: 'fg.subtle' }}>
                          ↙
                        </Text>
                        <Text>{usage.output}</Text>
                      </Box>
                    )}
                  </Box>
                );
              })()}
              {/* Scope tag for instrumented libraries */}
              {span.otel_scope_name && (
                <Label
                  size="small"
                  variant="secondary"
                  sx={{ flexShrink: 0, fontSize: '10px' }}
                >
                  {span.otel_scope_name}
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
