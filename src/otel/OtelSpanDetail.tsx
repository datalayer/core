/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSpanDetail – Detail panel for a selected span, with metadata,
 * collapsible attributes, gen_ai arguments, events, and links.
 *
 * @module otel/OtelSpanDetail
 */

import React, { useState } from 'react';
import type { OtelSpanDetailProps } from './types';
import { formatDuration, buildSpanTree } from './utils';
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
    <div
      style={{
        display: 'flex',
        padding: '5px 0',
        borderBottom: '1px solid #eaeef2',
        gap: 8,
      }}
    >
      <span
        style={{
          width: 140,
          minWidth: 140,
          color: '#656d76',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          fontFamily: mono
            ? 'ui-monospace, SFMono-Regular, monospace'
            : 'inherit',
          wordBreak: 'break-all',
        }}
      >
        {String(value)}
      </span>
    </div>
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
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          cursor: 'pointer',
          padding: '4px 0',
          userSelect: 'none',
        }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <span
          style={{
            fontSize: 10,
            background: '#ddf4ff',
            color: '#0969da',
            borderRadius: 10,
            padding: '0 6px',
            marginLeft: 4,
            lineHeight: '18px',
          }}
        >
          {Object.keys(data).length}
        </span>
      </div>
      {open && (
        <div
          style={{
            background: '#f6f8fa',
            borderRadius: 6,
            border: '1px solid #d0d7de',
            padding: 10,
            marginTop: 4,
            overflowX: 'auto',
          }}
        >
          {Object.entries(data).map(([key, val]) => (
            <AttributeRow key={key} attrKey={key} value={val} depth={0} />
          ))}
        </div>
      )}
    </div>
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
    <div
      style={{
        borderBottom: depth === 0 ? '1px solid #eaeef2' : 'none',
        paddingBottom: depth === 0 ? 4 : 0,
        marginBottom: depth === 0 ? 4 : 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '2px 0',
          paddingLeft: depth * 16,
          alignItems: 'flex-start',
        }}
      >
        {/* Expand toggle for nested */}
        {isNested ? (
          <span
            style={{
              cursor: 'pointer',
              fontSize: 11,
              color: '#656d76',
              userSelect: 'none',
              width: 12,
              flexShrink: 0,
            }}
            onClick={() => setOpen(!open)}
          >
            {open ? '▾' : '▸'}
          </span>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}
        <span
          style={{
            color: '#0550ae',
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            minWidth: 180,
            wordBreak: 'break-all',
            flexShrink: 0,
          }}
        >
          {attrKey}
        </span>
        {!isNested && (
          <span
            style={{
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: typeof value === 'string' ? '#0a3069' : '#953800',
            }}
          >
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </span>
        )}
        {isNested && !open && (
          <span
            style={{
              fontSize: 11,
              color: '#656d76',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            {isArray
              ? `[${(value as unknown[]).length} items]`
              : `{${Object.keys(value as object).length} keys}`}
          </span>
        )}
      </div>
      {isNested && open && (
        <div>
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
        </div>
      )}
    </div>
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
      <div style={{ padding: 32, color: '#656d76', textAlign: 'center' }}>
        Select a span to view details.
      </div>
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

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#0969da' : '#656d76',
    borderBottom: isActive ? '2px solid #0969da' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: isActive ? '#0969da' : 'transparent',
  });

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        borderLeft: '1px solid #d0d7de',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #d0d7de',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f6f8fa',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>{span.span_name}</span>
        {onClose && (
          <span
            style={{
              cursor: 'pointer',
              color: '#656d76',
              fontSize: 16,
              lineHeight: '16px',
              padding: '2px 4px',
              borderRadius: 4,
            }}
            onClick={onClose}
            onMouseEnter={e => (e.currentTarget.style.background = '#ffebe9')}
            onMouseLeave={e =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            ✕
          </span>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #d0d7de',
          background: '#f6f8fa',
          flexShrink: 0,
        }}
      >
        <button
          style={tabStyle(activeTab === 'details')}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        {tree && (
          <button
            style={tabStyle(activeTab === 'tree')}
            onClick={() => setActiveTab('tree')}
          >
            Trace Tree
          </button>
        )}
        <button
          style={tabStyle(activeTab === 'raw')}
          onClick={() => setActiveTab('raw')}
        >
          Raw Data
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'details' && (
          <div style={{ padding: 16 }}>
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
              <div style={{ marginTop: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Events ({span.events.length})
                </span>
                {span.events.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f6f8fa',
                      borderRadius: 6,
                      border: '1px solid #d0d7de',
                      padding: 8,
                      marginTop: 6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>
                        {ev.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#656d76',
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        }}
                      >
                        {ev.timestamp}
                      </span>
                    </div>
                    {ev.attributes && Object.keys(ev.attributes).length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {Object.entries(ev.attributes).map(([k, v]) => (
                          <AttributeRow
                            key={k}
                            attrKey={k}
                            value={v}
                            depth={0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Links */}
            {span.links && span.links.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Links ({span.links.length})
                </span>
                {span.links.map((link, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 12,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      padding: '4px 0',
                      borderBottom: '1px solid #eaeef2',
                    }}
                  >
                    trace: {link.trace_id} → span: {link.span_id}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tree' && tree && (
          <OtelSpanTree
            spans={tree}
            selectedSpanId={span.span_id}
            defaultExpandDepth={4}
          />
        )}

        {activeTab === 'raw' && (
          <pre
            style={{
              padding: 16,
              fontSize: 11,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              background: '#f6f8fa',
            }}
          >
            {JSON.stringify(span, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
