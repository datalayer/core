/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The placement of a trace's bars.
 *
 * Every case here is one a real trace produces: services whose clocks
 * disagree, a span that has started and not finished, an authorization check
 * two milliseconds long inside a ten-minute run. The drawing is only worth
 * reading if those are placed rather than dropped.
 *
 * @module views/mcp/__tests__/traceTimeline.unit.test
 */

import { describe, expect, it } from 'vitest';
import type { OtelSpan } from '../../../api/otel/types';
import type { McpSpanNode } from '../../../api/mcp/observability';
import { MIN_BAR_PERCENT, timelineRows, toneOf } from '../TraceTimeline';

const span = (
  id: string,
  start: string,
  end: string,
  extra: Partial<OtelSpan> = {},
): OtelSpan => ({
  trace_id: 'trace-1',
  span_id: id,
  span_name: id,
  service_name: 'jupyter-mcp-server',
  kind: 'SPAN_KIND_SERVER',
  start_time: start,
  end_time: end,
  duration_ms: Date.parse(end) - Date.parse(start),
  ...extra,
});

const node = (self: OtelSpan, children: McpSpanNode[] = []): McpSpanNode => ({
  span: self,
  children,
});

describe('timelineRows', () => {
  it('flattens the tree depth-first, keeping the depth for the indent', () => {
    const tree = [
      node(span('a', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        node(span('b', '2026-09-07T10:00:01Z', '2026-09-07T10:00:02Z'), [
          node(span('c', '2026-09-07T10:00:01Z', '2026-09-07T10:00:02Z')),
        ]),
      ]),
      node(span('d', '2026-09-07T10:00:05Z', '2026-09-07T10:00:06Z')),
    ];
    expect(
      timelineRows(tree).map(row => [row.span.span_id, row.depth]),
    ).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
      ['d', 0],
    ]);
  });

  it('places bars in proportion to the whole run', () => {
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        node(span('half', '2026-09-07T10:00:05Z', '2026-09-07T10:00:10Z')),
      ]),
    ];
    const [root, half] = timelineRows(tree);
    expect(root.left).toBe(0);
    expect(root.width).toBe(100);
    expect(half.left).toBe(50);
    expect(half.width).toBe(50);
  });

  it('shows the gap before a child as the queue time it is', () => {
    // The root runs for ten seconds; the work it waited on starts at eight.
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        node(span('late', '2026-09-07T10:00:08Z', '2026-09-07T10:00:10Z')),
      ]),
    ];
    const [, late] = timelineRows(tree);
    expect(late.left).toBe(80);
  });

  it('draws a span far too short to see as a mark', () => {
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:10:00Z'), [
        node(
          span('authz', '2026-09-07T10:00:00.000Z', '2026-09-07T10:00:00.002Z'),
        ),
      ]),
    ];
    const [, authz] = timelineRows(tree);
    expect(authz.width).toBe(MIN_BAR_PERCENT);
  });

  it('keeps every bar inside the track, including a mark at the very end', () => {
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        // Ends exactly when the run does and takes no time at all.
        node(span('last', '2026-09-07T10:00:10Z', '2026-09-07T10:00:10Z')),
      ]),
    ];
    for (const row of timelineRows(tree)) {
      expect(row.left).toBeGreaterThanOrEqual(0);
      expect(row.width).toBeGreaterThan(0);
      expect(row.left + row.width).toBeLessThanOrEqual(100);
    }
  });

  it('gives every bar the full width when the run has no duration to divide', () => {
    // One span that has started and not finished: `end_time` is its start.
    const tree = [
      node(span('running', '2026-09-07T10:00:00Z', '2026-09-07T10:00:00Z')),
    ];
    const [only] = timelineRows(tree);
    expect(only.left).toBe(0);
    expect(only.width).toBe(100);
  });

  it('places a span whose timestamps do not parse rather than dropping it', () => {
    const broken = span('broken', 'not-a-time', 'not-a-time');
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        node(broken),
      ]),
    ];
    const rows = timelineRows(tree);
    expect(rows.map(row => row.span.span_id)).toEqual(['root', 'broken']);
    const [, unplaceable] = rows;
    expect(unplaceable.left).toBe(0);
    expect(unplaceable.width).toBe(MIN_BAR_PERCENT);
  });

  it('does not let one bad end time flatten the whole trace', () => {
    // A span whose `end_time` will not parse is one span's problem. If its
    // NaN reaches the window, every bar in the trace loses its clock and the
    // timeline silently becomes a column of identical marks — the failure
    // that is hardest to notice, because it still draws.
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        node(span('half', '2026-09-07T10:00:05Z', 'not-a-time')),
      ]),
    ];
    const [root, half] = timelineRows(tree);
    expect(root.left).toBe(0);
    expect(root.width).toBe(100);
    expect(half.left).toBe(50);
    expect(half.width).toBe(MIN_BAR_PERCENT);
  });

  it('places a span whose end precedes its start without breaking the clock', () => {
    // `end_time` before `start_time` is what an in-flight span looks like
    // once the exporter has stamped a placeholder; the window must not run
    // backwards because of it.
    const tree = [
      node(span('root', '2026-09-07T10:00:00Z', '2026-09-07T10:00:10Z'), [
        node(span('inflight', '2026-09-07T10:00:04Z', '2026-09-07T09:00:00Z')),
      ]),
    ];
    const [root, inflight] = timelineRows(tree);
    expect(root.width).toBe(100);
    expect(inflight.left).toBe(40);
    expect(inflight.width).toBe(MIN_BAR_PERCENT);
  });

  it('has nothing to draw for a trace with no spans', () => {
    expect(timelineRows([])).toEqual([]);
  });
});

describe('toneOf', () => {
  it('tells the four services apart', () => {
    const durable = span('d', '2026-09-07T10:00:00Z', '2026-09-07T10:00:01Z', {
      service_name: 'datalayer-durable',
    });
    const gateway = span('g', '2026-09-07T10:00:00Z', '2026-09-07T10:00:01Z');
    expect(toneOf(durable)).not.toBe(toneOf(gateway));
  });

  it('draws a failed span as failed whatever emitted it', () => {
    const failed = span('f', '2026-09-07T10:00:00Z', '2026-09-07T10:00:01Z', {
      service_name: 'datalayer-runtimes',
      status_code: 'STATUS_CODE_ERROR',
    });
    expect(toneOf(failed)).toBe('danger.emphasis');
  });

  it('gives a service it has never seen a colour rather than nothing', () => {
    const stranger = span('s', '2026-09-07T10:00:00Z', '2026-09-07T10:00:01Z', {
      service_name: 'datalayer-something-new',
    });
    expect(toneOf(stranger)).toBeTruthy();
  });
});
