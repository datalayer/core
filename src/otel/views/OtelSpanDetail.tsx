/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSpanDetail – Detail panel for a selected span, with metadata,
 * collapsible attributes, gen_ai arguments, events, and links.
 *
 * Uses Primer React components for consistent theming.
 *
 * @module otel/OtelSpanDetail
 */

import React, { useState } from 'react';
import {
  Box,
  Text,
  IconButton,
  UnderlineNav,
  CounterLabel,
  Label,
} from '@primer/react';
import {
  XIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@primer/octicons-react';
import type { OtelSpanDetailProps } from '../types';
import { formatDuration, buildSpanTree } from '../utils';
import { OtelSpanTree } from './OtelSpanTree';

// ── Helpers ─────────────────────────────────────────────────────────

/** Single key–value metadata row. */
const MetadataRow: React.FC<{
  label: string;
  value: string | number | undefined | null;
  mono?: boolean;
}> = ({ label, value, mono = false }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Box
      sx={{
        display: 'flex',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'border.muted',
        gap: 2,
      }}
    >
      <Text
        sx={{
          width: 140,
          minWidth: 140,
          color: 'fg.muted',
          fontSize: 1,
          fontWeight: 'bold',
        }}
      >
        {label}
      </Text>
      <Text
        sx={{
          fontSize: 1,
          fontFamily: mono ? 'mono' : 'normal',
          wordBreak: 'break-all',
        }}
      >
        {String(value)}
      </Text>
    </Box>
  );
};

/** Collapsible section for nested JSON/attribute data with tree rendering. */
const CollapsibleSection: React.FC<{
  title: string;
  data: Record<string, unknown> | undefined | null;
  defaultOpen?: boolean;
}> = ({ title, data, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          py: 1,
          userSelect: 'none',
        }}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        <Text sx={{ fontSize: 1, fontWeight: 'bold' }}>{title}</Text>
        <CounterLabel>{Object.keys(data).length}</CounterLabel>
      </Box>
      {open && (
        <Box
          sx={{
            bg: 'canvas.subtle',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
            p: 2,
            mt: 1,
            overflowX: 'auto',
          }}
        >
          {Object.entries(data).map(([key, val]) => (
            <AttributeRow key={key} attrKey={key} value={val} depth={0} />
          ))}
        </Box>
      )}
    </Box>
  );
};

/** Recursive attribute row – supports nested objects and arrays. */
const AttributeRow: React.FC<{
  attrKey: string;
  value: unknown;
  depth: number;
}> = ({ attrKey, value, depth }) => {
  const [open, setOpen] = useState(depth < 1);
  const isObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isNested = isObject || isArray;

  return (
    <Box
      sx={{
        borderBottom: depth === 0 ? '1px solid' : 'none',
        borderColor: 'border.muted',
        pb: depth === 0 ? 1 : 0,
        mb: depth === 0 ? 1 : 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          py: 1,
          pl: depth * 16 + 'px',
          alignItems: 'flex-start',
        }}
      >
        {/* Expand toggle for nested */}
        {isNested ? (
          <Box
            sx={{
              cursor: 'pointer',
              color: 'fg.muted',
              userSelect: 'none',
              width: 16,
              flexShrink: 0,
            }}
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <ChevronDownIcon size={12} />
            ) : (
              <ChevronRightIcon size={12} />
            )}
          </Box>
        ) : (
          <Box sx={{ width: 16, flexShrink: 0 }} />
        )}
        <Text
          sx={{
            color: 'accent.fg',
            fontSize: 1,
            fontFamily: 'mono',
            minWidth: 180,
            wordBreak: 'break-all',
            flexShrink: 0,
          }}
        >
          {attrKey}
        </Text>
        {!isNested && (
          <Text
            sx={{
              fontSize: 1,
              fontFamily: 'mono',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color:
                typeof value === 'string' ? 'accent.emphasis' : 'attention.fg',
            }}
          >
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </Text>
        )}
        {isNested && !open && (
          <Text sx={{ fontSize: 0, color: 'fg.muted', fontFamily: 'mono' }}>
            {isArray
              ? `[${(value as unknown[]).length} items]`
              : `{${Object.keys(value as object).length} keys}`}
          </Text>
        )}
      </Box>
      {isNested && open && (
        <Box>
          {isArray
            ? (value as unknown[]).map((item, idx) => (
                <AttributeRow
                  key={idx}
                  attrKey={`[${idx}]`}
                  value={item}
                  depth={depth + 1}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <AttributeRow key={k} attrKey={k} value={v} depth={depth + 1} />
              ))}
        </Box>
      )}
    </Box>
  );
};

// ── Main component ──────────────────────────────────────────────────

export const OtelSpanDetail: React.FC<OtelSpanDetailProps> = ({
  span,
  traceSpans,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'tree' | 'raw'>(
    'details',
  );

  if (!span) {
    return (
      <Box sx={{ p: 5, color: 'fg.muted', textAlign: 'center' }}>
        <Text>Select a span to view details.</Text>
      </Box>
    );
  }

  // Separate gen_ai attributes from other attributes
  const genAiAttrs: Record<string, unknown> = {};
  const otherAttrs: Record<string, unknown> = {};
  if (span.attributes) {
    for (const [k, v] of Object.entries(span.attributes)) {
      if (k.startsWith('gen_ai.') || k.startsWith('model_request')) {
        genAiAttrs[k] = v;
      } else {
        otherAttrs[k] = v;
      }
    }
  }

  // Build tree from traceSpans for tree tab
  const tree =
    traceSpans && traceSpans.length > 0 ? buildSpanTree(traceSpans) : undefined;

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        borderLeft: '1px solid',
        borderColor: 'border.default',
        bg: 'canvas.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'border.default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bg: 'canvas.subtle',
          flexShrink: 0,
        }}
      >
        <Text sx={{ fontSize: 2, fontWeight: 'bold' }}>{span.span_name}</Text>
        {onClose && (
          <IconButton
            icon={XIcon}
            aria-label="Close detail panel"
            variant="invisible"
            size="small"
            onClick={onClose}
          />
        )}
      </Box>

      {/* Tabs */}
      <UnderlineNav aria-label="Span detail tabs">
        <UnderlineNav.Item
          aria-current={activeTab === 'details' ? 'page' : undefined}
          onClick={() => setActiveTab('details')}
        >
          Details
        </UnderlineNav.Item>
        {tree && (
          <UnderlineNav.Item
            aria-current={activeTab === 'tree' ? 'page' : undefined}
            onClick={() => setActiveTab('tree')}
          >
            Trace Tree
          </UnderlineNav.Item>
        )}
        <UnderlineNav.Item
          aria-current={activeTab === 'raw' ? 'page' : undefined}
          onClick={() => setActiveTab('raw')}
        >
          Raw Data
        </UnderlineNav.Item>
      </UnderlineNav>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'details' && (
          <Box sx={{ p: 3 }}>
            <MetadataRow label="span_name" value={span.span_name} />
            <MetadataRow label="service_name" value={span.service_name} />
            <MetadataRow label="otel_scope_name" value={span.otel_scope_name} />
            <MetadataRow label="kind" value={span.kind} />
            <MetadataRow label="trace_id" value={span.trace_id} mono />
            <MetadataRow label="span_id" value={span.span_id} mono />
            <MetadataRow
              label="parent_span_id"
              value={span.parent_span_id}
              mono
            />
            <MetadataRow
              label="duration"
              value={formatDuration(span.duration_ms)}
            />
            <MetadataRow label="start_time" value={span.start_time} mono />
            <MetadataRow label="end_time" value={span.end_time} mono />
            <MetadataRow label="status_code" value={span.status_code} />
            <MetadataRow label="status_message" value={span.status_message} />

            {/* Arguments (gen_ai attrs) */}
            <CollapsibleSection
              title="Arguments"
              data={genAiAttrs}
              defaultOpen={Object.keys(genAiAttrs).length > 0}
            />

            {/* Other attributes */}
            <CollapsibleSection title="Attributes" data={otherAttrs} />

            {/* Events */}
            {span.events && span.events.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>Events</Text>
                  <CounterLabel>{span.events.length}</CounterLabel>
                </Box>
                {span.events.map((ev, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      bg: 'canvas.subtle',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'border.default',
                      p: 2,
                      mt: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Label>{ev.name}</Label>
                      <Text
                        sx={{
                          fontSize: 0,
                          color: 'fg.muted',
                          fontFamily: 'mono',
                        }}
                      >
                        {ev.timestamp}
                      </Text>
                    </Box>
                    {ev.attributes && Object.keys(ev.attributes).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {Object.entries(ev.attributes).map(([k, v]) => (
                          <AttributeRow
                            key={k}
                            attrKey={k}
                            value={v}
                            depth={0}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Links */}
            {span.links && span.links.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>Links</Text>
                  <CounterLabel>{span.links.length}</CounterLabel>
                </Box>
                {span.links.map((link, idx) => (
                  <Text
                    key={idx}
                    sx={{
                      display: 'block',
                      fontSize: 1,
                      fontFamily: 'mono',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'border.muted',
                    }}
                  >
                    trace: {link.trace_id} → span: {link.span_id}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        )}

        {activeTab === 'tree' && tree && (
          <OtelSpanTree
            spans={tree}
            selectedSpanId={span.span_id}
            defaultExpandDepth={4}
          />
        )}

        {activeTab === 'raw' && (
          <Box
            as="pre"
            sx={{
              p: 3,
              fontSize: 0,
              fontFamily: 'mono',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              m: 0,
              bg: 'canvas.subtle',
            }}
          >
            {JSON.stringify(span, null, 2)}
          </Box>
        )}
      </Box>
    </Box>
  );
};
