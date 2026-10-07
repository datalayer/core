/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelLiveSpans – the spans of a page's own tracer (`createOtelLiveTracer`),
 * drawn as they happen: the traces list (each trace a tree, unfolded), and
 * the selected span's detail (its attributes, events, trace tree, raw data).
 *
 * One service's own (`service`): what it did, and the calls made toward it
 * (`peer.service`). Filters by facets (the service, the span kind, or any
 * value a span carries); *Pause* holds the rows still while the record goes
 * on, *Clear* empties it, *Export* saves the spans as JSON.
 *
 * @module otel/views/OtelLiveSpans
 */

import React, { useMemo, useState } from 'react';
import { ActionList, ActionMenu, Box, Button, Text } from '@primer/react';
import {
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@primer/octicons-react';
import type { OtelSpan } from '../types';
import { toMs } from '../utils';
import { spansOfService } from '../live/filter';
import type { OtelLiveExport, OtelLiveTracer } from '../live/tracer';
import { useOtelLiveSpans } from '../live/useOtelLiveSpans';
import { OtelTracesList } from './OtelTracesList';
import { OtelSpanDetail } from './OtelSpanDetail';

/** A filter menu: the values a span has for it, each to keep or not. */
export interface OtelSpanFacet {
  label: string;
  /** The span's value for it; `undefined` when it has none. */
  value: (span: OtelSpan) => string | undefined;
  /** A value, in words. */
  name?: (value: string) => string;
}

/** The facets unless said: the service and the span kind. */
export const DEFAULT_SPAN_FACETS: readonly OtelSpanFacet[] = [
  { label: 'Service', value: span => span.service_name },
  { label: 'Kind', value: span => span.kind },
];

export interface OtelLiveSpansProps {
  /** The tracer whose spans are drawn, kept current. */
  tracer?: OtelLiveTracer | null;
  /** Or the spans, as given. */
  spans?: readonly OtelSpan[];
  /** One service's own: done by it, or toward it. */
  service?: string;
  facets?: readonly OtelSpanFacet[];
  /** Narrower columns, the detail under the list. */
  compact?: boolean;
  /** How tall the list grows before it scrolls. */
  maxHeight?: number | string;
  /** Where the selected span's detail goes. Default `below`. */
  detailPlacement?: 'below' | 'side';
  /** What is said while there is no span. */
  emptyText?: string;
  /** The file the spans are exported as, without `.json`. */
  exportName?: string;
  /** The toolbar's name. */
  label?: string;
  renderSpanMark?: (span: OtelSpan) => React.ReactNode;
  describeSpan?: (span: OtelSpan) => string | undefined;
}

/** The spans each facet keeps: an empty selection keeps every value. */
export function filterSpansByFacets(
  spans: readonly OtelSpan[],
  facets: readonly OtelSpanFacet[],
  selected: readonly ReadonlySet<string>[],
): OtelSpan[] {
  return spans.filter(span =>
    facets.every((facet, index) => {
      const values = selected[index];
      if (!values?.size) return true;
      const value = facet.value(span);
      return value !== undefined && values.has(value);
    }),
  );
}

function toggle(set: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function FacetMenu({
  facet,
  options,
  selected,
  onChange,
}: {
  facet: OtelSpanFacet;
  options: readonly string[];
  selected: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
}) {
  const name = facet.name ?? ((value: string) => value);
  return (
    <ActionMenu>
      <ActionMenu.Button
        size="small"
        data-otel-facet={facet.label.toLowerCase()}
      >
        {facet.label}
        {selected.size ? ` · ${selected.size}` : ''}
      </ActionMenu.Button>
      <ActionMenu.Overlay width="auto">
        <ActionList selectionVariant="multiple" aria-label={facet.label}>
          <ActionList.Item
            selected={!selected.size}
            onSelect={() => onChange(new Set())}
          >
            All
          </ActionList.Item>
          <ActionList.Divider />
          {options.map(option => (
            <ActionList.Item
              key={option}
              selected={selected.has(option)}
              onSelect={() => onChange(toggle(selected, option))}
            >
              {name(option)}
            </ActionList.Item>
          ))}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}

/** Save the spans as a JSON file. */
function download(name: string, record: OtelLiveExport) {
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const OtelLiveSpans: React.FC<OtelLiveSpansProps> = ({
  tracer,
  spans: given,
  service,
  facets = DEFAULT_SPAN_FACETS,
  compact = false,
  maxHeight = 420,
  detailPlacement = 'below',
  emptyText = 'Nothing recorded yet.',
  exportName = 'otel-spans',
  label = 'Spans',
  renderSpanMark,
  describeSpan,
}) => {
  const live = useOtelLiveSpans(given ? null : tracer);
  const everything = given ?? live;
  const [clearedAt, setClearedAt] = useState(0);
  const [held, setHeld] = useState<readonly OtelSpan[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>[]>(() =>
    facets.map(() => new Set<string>()),
  );
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const recorded = useMemo(() => {
    const own = spansOfService(everything, service);
    return clearedAt
      ? own.filter(span => toMs(span.start_time) >= clearedAt)
      : own;
  }, [everything, service, clearedAt]);
  const shown = held ?? recorded;
  const waiting = held ? recorded.length - held.length : 0;
  const options = useMemo(
    () =>
      facets.map(facet =>
        [
          ...new Set(
            recorded
              .map(span => facet.value(span))
              .filter((value): value is string => value !== undefined),
          ),
        ].sort(),
      ),
    [facets, recorded],
  );
  const rows = useMemo(
    () => filterSpansByFacets(shown, facets, selected),
    [shown, facets, selected],
  );
  // The selected span as it is now: a live span changes as it goes.
  const selectedSpan = useMemo(
    () =>
      selectedSpanId
        ? (everything.find(span => span.span_id === selectedSpanId) ?? null)
        : null,
    [everything, selectedSpanId],
  );
  const traceSpans = useMemo(
    () =>
      selectedSpan
        ? everything.filter(span => span.trace_id === selectedSpan.trace_id)
        : [],
    [everything, selectedSpan],
  );
  const side = detailPlacement === 'side' && !compact;

  return (
    <Box
      data-otel-live-spans=""
      sx={{
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        bg: 'canvas.default',
        color: 'fg.default',
        minWidth: 0,
      }}
    >
      <Box
        role="toolbar"
        aria-label={label}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'border.default',
        }}
      >
        {facets.map((facet, index) => (
          <FacetMenu
            key={facet.label}
            facet={facet}
            options={options[index] ?? []}
            selected={selected[index] ?? new Set()}
            onChange={next =>
              setSelected(prev =>
                facets.map((_, at) =>
                  at === index ? next : (prev[at] ?? new Set()),
                ),
              )
            }
          />
        ))}
        <Box sx={{ flex: 1 }} />
        <Text sx={{ fontSize: 0, color: 'fg.muted' }} data-otel-span-count="">
          {rows.length === shown.length
            ? `${rows.length} ${rows.length === 1 ? 'span' : 'spans'}`
            : `${rows.length} of ${shown.length}`}
          {waiting > 0 ? ` · ${waiting} new` : ''}
        </Text>
        <Button
          size="small"
          leadingVisual={held ? PlayIcon : PauseIcon}
          aria-pressed={held !== null}
          onClick={() => setHeld(held ? null : recorded)}
          data-otel-pause=""
        >
          {held ? 'Resume' : 'Pause'}
        </Button>
        <Button
          size="small"
          leadingVisual={TrashIcon}
          onClick={() => {
            setHeld(null);
            setSelectedSpanId(null);
            // One service's view of a shared record clears only itself.
            if (tracer && !given && !service) {
              tracer.clear();
            } else {
              setClearedAt(Date.now());
            }
          }}
          data-otel-clear=""
        >
          Clear
        </Button>
        <Button
          size="small"
          leadingVisual={DownloadIcon}
          disabled={!recorded.length}
          onClick={() =>
            download(exportName, {
              exportedAt: new Date().toISOString(),
              spans: [...recorded],
            })
          }
          data-otel-export=""
        >
          Export
        </Button>
      </Box>
      <Box
        sx={{
          display: side ? 'grid' : 'block',
          gridTemplateColumns: side
            ? 'minmax(0, 3fr) minmax(0, 2fr)'
            : undefined,
        }}
      >
        <Box sx={{ maxHeight, overflowY: 'auto', minWidth: 0 }}>
          <OtelTracesList
            spans={rows}
            selectedSpanId={selectedSpanId}
            onSelectSpan={span => setSelectedSpanId(span.span_id)}
            emptyText={emptyText}
            compact={compact}
            defaultExpanded
            renderSpanMark={renderSpanMark}
            describeSpan={describeSpan}
          />
        </Box>
        {selectedSpan && (
          <Box
            data-otel-live-detail=""
            sx={{
              maxHeight,
              overflowY: 'auto',
              minWidth: 0,
              borderTop: side ? 'none' : '1px solid',
              borderColor: 'border.default',
            }}
          >
            <OtelSpanDetail
              span={selectedSpan}
              traceSpans={traceSpans}
              onClose={() => setSelectedSpanId(null)}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default OtelLiveSpans;
