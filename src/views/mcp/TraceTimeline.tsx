/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where a run's time went.
 *
 * A run crosses four processes — the gateway that accepted the call, the
 * durable engine that recorded it, the worker that executed it, and the
 * sandbox that ran the code — and the question a person actually has when a
 * run took eleven minutes is *which of them* took the eleven minutes. A list
 * of spans does not answer that; the same spans laid against one clock do.
 *
 * **The bars are proportional, the rows are the tree.** Nesting comes from
 * `parent_span_id`, so a step that waited on a sandbox sits under the step
 * that waited, and its bar sits inside its parent's — a gap between a
 * parent's bar and its children's is queue time, which is the thing worth
 * seeing and the thing a table of durations hides.
 *
 * **It draws spans from every service, not the gateway's alone.** The
 * `durable.*` and `runtimes.*` spans are the ones that explain a slow run;
 * showing only what the gateway emitted would show the eleven minutes as one
 * unexplained bar. Services are told apart by colour and named on the row.
 *
 * @module views/mcp/TraceTimeline
 */

import type { JSX } from 'react';
import { Heading, Label, Text, Truncate } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import type { OtelSpan } from '../../api/otel/types';
import type { McpSpanNode } from '../../api/mcp/observability';
import { durationLabel } from './format';

/**
 * The narrowest a bar is drawn, as a percentage of the run.
 *
 * A 2ms authorization check inside a ten-minute run is 0.003% wide, which is
 * nothing at all — and the check happening is exactly what somebody reading
 * a trace is looking for. It is drawn as a mark rather than dropped; the
 * label carries the real duration.
 */
export const MIN_BAR_PERCENT = 0.75;

/** One span, placed against the run's clock. */
export interface TimelineRow {
  span: OtelSpan;
  /** How deep in the span tree, for the indent. */
  depth: number;
  /** Where the bar starts, as a percentage of the whole run. */
  left: number;
  /** How wide it is, as a percentage. Never zero — an instant is still a mark. */
  width: number;
}

/** The instants a span covers, as epoch milliseconds; `end` is never before `start`. */
const extentOf = (span: OtelSpan): { start: number; end: number } => {
  const start = Date.parse(span.start_time);
  const end = Date.parse(span.end_time);
  return {
    start,
    end: Number.isFinite(end) ? end : start,
  };
};

/**
 * The spans of a trace, flattened depth-first and placed against one clock.
 *
 * Three cases are not the ordinary one and each is drawn rather than
 * dropped, because a trace a person opens is a trace they need to read:
 *
 * - a span whose timestamps do not parse is placed at the left as a mark —
 *   it happened, we cannot say when;
 * - a trace with no duration at all — one instant, or a single unfinished
 *   span — gives every bar the full width, since there is nothing to divide;
 * - a child that starts before its parent, which clock skew between two
 *   services makes real, is clamped into the run rather than drawn off the
 *   end of it.
 */
export const timelineRows = (tree: McpSpanNode[]): TimelineRow[] => {
  const flat: { span: OtelSpan; depth: number }[] = [];
  const walk = (nodes: McpSpanNode[], depth: number): void => {
    for (const node of nodes) {
      flat.push({ span: node.span, depth });
      walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);

  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;
  for (const { span } of flat) {
    const { start, end } = extentOf(span);
    if (Number.isFinite(start)) {
      first = Math.min(first, start);
      last = Math.max(last, end);
    }
  }
  const total = last - first;

  return flat.map(({ span, depth }) => {
    const { start, end } = extentOf(span);
    if (!Number.isFinite(start) || !Number.isFinite(total) || total <= 0) {
      // No clock to divide: an unplaceable span is a mark, and a run with no
      // duration is one bar across.
      const placeable = Number.isFinite(start) && Number.isFinite(total);
      return { span, depth, left: 0, width: placeable ? 100 : MIN_BAR_PERCENT };
    }
    // The width is settled first, then the bar is slid left far enough to
    // hold it: a zero-length span at the very end of a run is a mark that
    // has to fit inside the track, not one hanging off its right edge.
    const width = Math.max(MIN_BAR_PERCENT, ((end - start) / total) * 100);
    const left = Math.min(
      100 - width,
      Math.max(0, ((start - first) / total) * 100),
    );
    return { span, depth, left, width };
  });
};

/**
 * A colour per service, so the four processes are told apart at a glance.
 *
 * Named by what the service *is* rather than by its span prefix: the same
 * palette has to hold when a fifth service starts emitting, and the fallback
 * is a neutral rather than a collision.
 */
export const SERVICE_TONE: Record<string, string> = {
  'jupyter-mcp-server': 'accent.emphasis',
  'datalayer-durable': 'done.emphasis',
  'datalayer-runtimes': 'success.emphasis',
  'datalayer-iam': 'severe.emphasis',
};

/** The bar colour of a span, by the service that emitted it and how it ended. */
export const toneOf = (span: OtelSpan): string => {
  if (
    span.status_code === 'STATUS_CODE_ERROR' ||
    span.status_code === 'ERROR'
  ) {
    return 'danger.emphasis';
  }
  return SERVICE_TONE[span.service_name] ?? 'neutral.emphasis';
};

export interface TraceTimelineProps {
  /** The spans, already parented — `McpRunTrace.tree`. */
  tree: McpSpanNode[];
  /** The trace these are of, shown so it can be copied into a log query. */
  traceId?: string;
  /** Whether the run is still going, which is why the trace may be short. */
  live?: boolean;
}

export const TraceTimeline = ({
  tree,
  traceId,
  live = false,
}: TraceTimelineProps): JSX.Element => {
  const rows = timelineRows(tree);

  if (rows.length === 0) {
    return (
      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
        {live
          ? 'No spans yet. They arrive as the services report them.'
          : 'This run reported no spans. A run started before tracing reached the service that ran it has none.'}
      </Text>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1, minWidth: 0 }}>
      {traceId && (
        <Text sx={{ fontFamily: 'mono', fontSize: 0, color: 'fg.muted' }}>
          {traceId}
        </Text>
      )}
      {rows.map(row => (
        <Box
          key={row.span.span_id}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 14rem) 1fr auto',
            gap: 2,
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <Box sx={{ pl: row.depth, minWidth: 0 }}>
            <Truncate
              title={`${row.span.span_name} · ${row.span.service_name}`}
              sx={{ fontSize: 0, maxWidth: '100%' }}
            >
              {row.span.span_name}
            </Truncate>
          </Box>
          <Box
            sx={{
              position: 'relative',
              height: '0.75rem',
              bg: 'canvas.subtle',
              borderRadius: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${row.left}%`,
                width: `${row.width}%`,
                bg: toneOf(row.span),
                borderRadius: 1,
              }}
              title={`${row.span.service_name} · ${durationLabel(row.span.duration_ms)}`}
            />
          </Box>
          <Text
            sx={{
              fontSize: 0,
              color: 'fg.muted',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {durationLabel(row.span.duration_ms)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/** The timeline under its own heading, as the Runs detail draws it. */
export const TraceTimelineSection = (
  props: TraceTimelineProps,
): JSX.Element => (
  <Box>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
      <Heading as="h3" sx={{ fontSize: 1 }}>
        Where the time went
      </Heading>
      {props.live && (
        <Label size="small" variant="success">
          Live
        </Label>
      )}
    </Box>
    <TraceTimeline {...props} />
  </Box>
);

export default TraceTimeline;
