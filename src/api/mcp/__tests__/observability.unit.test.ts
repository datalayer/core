/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  MCP_DURABLE_SERVICE_NAME,
  MCP_GATEWAY_SERVICE_NAME,
  MCP_METRIC_CATALOG,
  serviceNameFor,
  fetchMcpLogs,
  fetchRunTrace,
  percentile,
  spanTree,
  summarizeMetricPoints,
  summarizeRequestSpans,
} from '../observability';
import type { OtelSpan } from '../../otel/types';

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const span = (overrides: Partial<OtelSpan>): OtelSpan => ({
  trace_id: 'abc',
  span_id: 's',
  span_name: 'mcp.request',
  service_name: MCP_GATEWAY_SERVICE_NAME,
  kind: 'SERVER',
  start_time: '2026-08-27T10:00:00Z',
  end_time: '2026-08-27T10:00:01Z',
  duration_ms: 100,
  ...overrides,
});

describe('MCP observability', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('takes the nearest-rank percentile', () => {
    expect(percentile([], 0.95)).toBeNull();
    expect(percentile([5], 0.95)).toBe(5);
    expect(percentile([10, 1, 7, 3, 100], 0.5)).toBe(7);
    expect(percentile([10, 1, 7, 3, 100], 0.95)).toBe(100);
  });

  it('reads the four SLIs off the catalog points', () => {
    const summary = summarizeMetricPoints(
      {
        'mcp.calls': [
          { metric_name: 'mcp.calls', service_name: 's', value: 8, timestamp: '2026-08-27T10:00:00Z', attributes: { outcome: 'ok' } },
          { metric_name: 'mcp.calls', service_name: 's', value: 2, timestamp: '2026-08-27T10:00:00Z', attributes: { outcome: 'error' } },
          { metric_name: 'mcp.calls', service_name: 's', value: 100, timestamp: '2026-08-26T10:00:00Z', attributes: { outcome: 'error' } },
        ],
        'mcp.call.duration': [
          { metric_name: 'mcp.call.duration', service_name: 's', value: 50, timestamp: '2026-08-27T10:00:00Z' },
          { metric_name: 'mcp.call.duration', service_name: 's', value: 900, timestamp: '2026-08-27T10:00:00Z' },
        ],
        'mcp.tasks': [
          { metric_name: 'mcp.tasks', service_name: 's', value: 3, timestamp: '2026-08-27T10:00:00Z', attributes: { status: 'completed' } },
          { metric_name: 'mcp.tasks', service_name: 's', value: 1, timestamp: '2026-08-27T10:00:00Z', attributes: { status: 'failed' } },
          { metric_name: 'mcp.tasks', service_name: 's', value: 5, timestamp: '2026-08-27T10:00:00Z', attributes: { status: 'working' } },
        ],
        'sandbox.launch_seconds': [
          { metric_name: 'sandbox.launch_seconds', service_name: 's', value: 4, timestamp: '2026-08-27T10:00:00Z', attributes: { provider: 'datalayer' } },
          { metric_name: 'sandbox.launch_seconds', service_name: 's', value: 9, timestamp: '2026-08-27T10:00:00Z', attributes: { provider: 'e2b' } },
        ],
      },
      { since: '2026-08-27T00:00:00Z' },
    );
    expect(summary.availability).toBe(0.8);
    expect(summary.p95CallDurationMs).toBe(900);
    expect(summary.taskSuccessRate).toBe(0.75);
    expect(summary.p95SandboxLaunchSeconds).toEqual({ datalayer: 4, e2b: 9 });
    expect(summary.samples).toEqual({ calls: 10, tasks: 4, launches: 2 });
  });

  it('reads a per-agent SLI off the request spans, which carry client.id', () => {
    const spans = [
      span({ span_id: 'a', attributes: { 'client.id': 'agent-1', 'http.response.status_code': 200 }, duration_ms: 20 }),
      span({ span_id: 'b', attributes: { 'client.id': 'agent-1', 'rpc.jsonrpc.error_code': '-32001' }, duration_ms: 30 }),
      span({ span_id: 'c', attributes: { 'client.id': 'agent-2' }, duration_ms: 5000 }),
      span({ span_id: 'd', attributes: { 'client.id': 'agent-1', 'mcp.task.id': 't1', 'mcp.task.status': 'completed' } }),
      span({ span_id: 'e', span_name: 'mcp.policy', attributes: { 'client.id': 'agent-1' } }),
    ];
    const summary = summarizeRequestSpans(spans, { agent: 'agent-1' });
    expect(summary.samples.calls).toBe(3);
    expect(summary.availability).toBeCloseTo(2 / 3);
    expect(summary.p95CallDurationMs).toBe(30);
    expect(summary.taskSuccessRate).toBe(1);
  });

  it('arranges spans as a tree, roots first, siblings by start', () => {
    const tree = spanTree([
      span({ span_id: 'child-2', parent_span_id: 'root', start_time: '2026-08-27T10:00:02Z' }),
      span({ span_id: 'root' }),
      span({ span_id: 'child-1', parent_span_id: 'root', start_time: '2026-08-27T10:00:01Z' }),
      span({ span_id: 'orphan', parent_span_id: 'elsewhere' }),
    ]);
    expect(tree.map(node => node.span.span_id)).toEqual(['root', 'orphan']);
    expect(tree[0].children.map(node => node.span.span_id)).toEqual(['child-1', 'child-2']);
  });

  it('answers an empty trace and no logs for a task that has no trace id yet', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI');
    const trace = await fetchRunTrace(TOKEN, { uid: '01T', traceId: null }, 'https://otel.test');
    const logs = await fetchMcpLogs(TOKEN, { uid: '01T' }, {}, 'https://otel.test');
    expect(trace.spans).toEqual([]);
    expect(logs.records).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('reads the trace and the logs of a task by its trace id', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ trace_id: 'abc', data: [span({ span_id: 'root' })] })
      .mockResolvedValueOnce({ data: [{ timestamp: '2026-08-27T10:00:00Z', severity_text: 'INFO', body: 'ran', service_name: 's', trace_id: 'abc' }] });

    const trace = await fetchRunTrace(TOKEN, { uid: '01T', traceId: 'abc' }, 'https://otel.test');
    const logs = await fetchMcpLogs(TOKEN, { uid: '01T', traceId: 'abc' }, { limit: 10 }, 'https://otel.test');

    expect(trace.tree[0].span.span_id).toBe('root');
    expect(logs.records[0].body).toBe('ran');
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: 'https://otel.test/api/otel/v1/traces/abc' }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: 'https://otel.test/api/otel/v1/logs?trace_id=abc&limit=10' }),
    );
  });
});

describe('which service a metric is queried against', () => {
  /**
   * A metric's service is a property of the metric, not of the caller. The
   * `durable.*` metrics come from `datalayer-durable`; asking the gateway for
   * them is a well-formed query, truthfully answered with nothing, rendering
   * a legitimate-looking zero. That is the failure that had three panels
   * querying `mcp.forwarded` and `mcp.sandbox_lost`.
   */
  it('sends durable metrics to the durable service', () => {
    expect(serviceNameFor('durable.step.duration')).toBe(MCP_DURABLE_SERVICE_NAME);
    expect(serviceNameFor('durable.queue.wait')).toBe(MCP_DURABLE_SERVICE_NAME);
    expect(serviceNameFor('durable.recoveries')).toBe(MCP_DURABLE_SERVICE_NAME);
  });

  it('sends gateway metrics to the gateway', () => {
    expect(serviceNameFor('mcp.calls')).toBe(MCP_GATEWAY_SERVICE_NAME);
    expect(serviceNameFor('sandbox.launch_seconds')).toBe(MCP_GATEWAY_SERVICE_NAME);
  });

  it('covers every metric in the catalog', () => {
    // A metric added without a service is one that silently inherits the
    // gateway's, which is right for most and wrong for exactly the ones
    // that matter.
    for (const metric of MCP_METRIC_CATALOG) {
      expect(serviceNameFor(metric)).toBeTruthy();
    }
  });
});
