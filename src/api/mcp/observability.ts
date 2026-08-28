/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The observability of the Jupyter MCP Server, read from the Datalayer OTEL
 * service — never from the gateway, which adds no telemetry route.
 *
 * Audit answers *who did what, and was it allowed*; this answers *how did
 * it run*. A task carries its `trace_id`, so "show me this run" is the
 * task's spans; its logs are the log records of that trace; and the four
 * SLIs are read from the gateway's metric catalog. Metrics carry no user,
 * agent or organization label by design, so a per-agent reading is
 * computed from the `mcp.request` spans, which do carry `client.id` and
 * `org.uid`.
 *
 * @module api/mcp/observability
 */

import { DEFAULT_SERVICE_URLS } from '../constants';
import { getTrace, listTraces } from '../otel/traces';
import { queryMetrics } from '../otel/metrics';
import { queryLogs } from '../otel/logs';
import type { OtelLog, OtelMetric, OtelSpan } from '../otel/types';
import type { McpTask } from '../../models/McpTask';

/**
 * The `service.name` the gateway exports under, and the one its workers use.
 *
 * The bare service name, like every other Datalayer service (`contents`,
 * `iam`, `runtimes`): `instrument(app, name)` is what sets it. A worker is a
 * process of its own and is filed separately, so a worker's last lines stay
 * queryable after the process is gone.
 */
export const MCP_GATEWAY_SERVICE_NAME = 'jupyter-mcp-server';

/** The `service.name` a worker's relayed output is filed under. */
export const MCP_WORKER_SERVICE_NAME = 'jupyter-mcp-worker';

/**
 * The `service.name` the durable execution service exports under.
 *
 * The `durable.*` metrics come from there, not from the gateway. Querying
 * them against the gateway would be well formed, would be answered
 * truthfully with nothing, and would render a legitimate-looking zero — the
 * same failure that had three panels querying `mcp.forwarded` and
 * `mcp.sandbox_lost`. `serviceNameFor` exists so the question is answered
 * once rather than at each call site.
 */
export const MCP_DURABLE_SERVICE_NAME = 'datalayer-durable';

/**
 * Which service emits a metric.
 *
 * A metric's service is a property of the metric, not of the caller. Reading
 * it from here is what keeps a new panel from inheriting whichever constant
 * happened to be in scope where it was written.
 */
export const serviceNameFor = (metric: McpMetricName): string =>
  metric.startsWith('durable.')
    ? MCP_DURABLE_SERVICE_NAME
    : MCP_GATEWAY_SERVICE_NAME;

/** The metric catalog `telemetry.py` owns; no ad-hoc counters. */
export const MCP_METRIC_CATALOG = [
  'mcp.calls',
  'mcp.call.duration',
  'mcp.refusals',
  'mcp.forwards',
  'mcp.workers',
  'mcp.worker_start_seconds',
  'mcp.bindings',
  'mcp.sandbox.lost',
  'mcp.tasks',
  'mcp.task.duration',
  'durable.step.duration',
  'durable.queue.wait',
  'durable.recoveries',
  'sandbox.launch_seconds',
  'mcp.audit.writes',
  'mcp.audit.write_failures',
  'mcp.dependency.duration',
  'mcp.dependency.timeouts',
  'mcp.dependency.ready',
  'mcp.readiness.failures',
] as const;

export type McpMetricName = (typeof MCP_METRIC_CATALOG)[number];

/** The four SLIs, and the catalog metric each is read from. */
export const MCP_SLI_METRICS = {
  availability: 'mcp.calls',
  latency: 'mcp.call.duration',
  taskSuccess: 'mcp.tasks',
  sandboxLaunch: 'sandbox.launch_seconds',
} as const satisfies Record<string, McpMetricName>;

export interface McpMetricsFilters {
  /** The `client_id` of one agent: read from spans, not from metrics. */
  agent?: string;
  org?: string;
  /** ISO 8601; points and spans before it are left out. */
  since?: string;
  limit?: number;
}

export interface McpSliSummary {
  /** Share of calls that were neither 5xx nor `-32001`; `null` with no call. */
  availability: number | null;
  /** p95 of the synchronous tools' call duration, in milliseconds. */
  p95CallDurationMs: number | null;
  /** `completed` over terminal tasks. */
  taskSuccessRate: number | null;
  /** p95 sandbox launch, in seconds, by provider. */
  p95SandboxLaunchSeconds: Record<string, number>;
  /** How many calls, tasks and launches the numbers rest on. */
  samples: { calls: number; tasks: number; launches: number };
}

export interface McpMetricsSnapshot {
  filters: McpMetricsFilters;
  /** The catalog points read, by metric name. */
  metrics: Partial<Record<McpMetricName, OtelMetric[]>>;
  /** The `mcp.request` spans a per-agent or per-organization reading rests on. */
  spans: OtelSpan[];
  slis: McpSliSummary;
  readAt: string;
}

/** The nearest-rank percentile of a sample; `null` for an empty one. */
export const percentile = (values: number[], fraction: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[rank];
};

const attribute = (holder: { attributes?: Record<string, unknown> }, name: string): string =>
  String(holder.attributes?.[name] ?? '');

const notBefore = (timestamp: string | undefined, since?: string): boolean =>
  !since || !timestamp || timestamp >= since;

/** Whether an `mcp.request` span is a failed call in the availability sense. */
const isUnavailable = (span: OtelSpan): boolean => {
  const status = attribute(span, 'http.response.status_code') || attribute(span, 'http.status_code');
  const rpc = attribute(span, 'rpc.jsonrpc.error_code') || attribute(span, 'mcp.error.code');
  return status.startsWith('5') || rpc === '-32001';
};

/**
 * The SLIs over catalog points — the platform-wide reading.
 *
 * `mcp.calls{outcome}` gives availability, `mcp.call.duration{tool}` the
 * latency, `mcp.tasks{status}` the task success rate and
 * `sandbox.launch_seconds{provider}` the launches.
 */
export const summarizeMetricPoints = (
  metrics: Partial<Record<McpMetricName, OtelMetric[]>>,
  filters: McpMetricsFilters = {},
): McpSliSummary => {
  const within = (point: OtelMetric) => notBefore(point.timestamp, filters.since);
  const calls = (metrics['mcp.calls'] ?? []).filter(within);
  const totalCalls = calls.reduce((sum, point) => sum + point.value, 0);
  const failedCalls = calls
    .filter(point => ['error', 'unavailable'].includes(attribute(point, 'outcome')))
    .reduce((sum, point) => sum + point.value, 0);
  const durations = (metrics['mcp.call.duration'] ?? []).filter(within).map(point => point.value);
  const tasks = (metrics['mcp.tasks'] ?? []).filter(within);
  const terminal = tasks.filter(point =>
    ['completed', 'failed', 'cancelled'].includes(attribute(point, 'status')),
  );
  const totalTerminal = terminal.reduce((sum, point) => sum + point.value, 0);
  const completed = terminal
    .filter(point => attribute(point, 'status') === 'completed')
    .reduce((sum, point) => sum + point.value, 0);
  const launches = (metrics['sandbox.launch_seconds'] ?? []).filter(within);
  const byProvider = new Map<string, number[]>();
  for (const point of launches) {
    const provider = attribute(point, 'provider') || 'unknown';
    byProvider.set(provider, [...(byProvider.get(provider) ?? []), point.value]);
  }
  const p95SandboxLaunchSeconds: Record<string, number> = {};
  for (const [provider, values] of byProvider) {
    const p95 = percentile(values, 0.95);
    if (p95 !== null) {
      p95SandboxLaunchSeconds[provider] = p95;
    }
  }
  return {
    availability: totalCalls > 0 ? (totalCalls - failedCalls) / totalCalls : null,
    p95CallDurationMs: percentile(durations, 0.95),
    taskSuccessRate: totalTerminal > 0 ? completed / totalTerminal : null,
    p95SandboxLaunchSeconds,
    samples: { calls: totalCalls, tasks: totalTerminal, launches: launches.length },
  };
};

/**
 * The SLIs over `mcp.request` spans — the per-agent or per-organization
 * reading, since metrics carry neither label.
 */
export const summarizeRequestSpans = (
  spans: OtelSpan[],
  filters: McpMetricsFilters = {},
): McpSliSummary => {
  const selected = spans.filter(
    span =>
      span.span_name === 'mcp.request' &&
      notBefore(span.start_time, filters.since) &&
      (!filters.agent || attribute(span, 'client.id') === filters.agent) &&
      (!filters.org || attribute(span, 'org.uid') === filters.org),
  );
  const unavailable = selected.filter(isUnavailable).length;
  const tasks = new Map<string, string>();
  for (const span of selected) {
    const taskId = attribute(span, 'mcp.task.id');
    if (taskId) {
      tasks.set(taskId, attribute(span, 'mcp.task.status') || span.status_code || '');
    }
  }
  const terminal = [...tasks.values()].filter(status =>
    ['completed', 'failed', 'cancelled'].includes(status),
  );
  const completed = terminal.filter(status => status === 'completed').length;
  return {
    availability: selected.length > 0 ? (selected.length - unavailable) / selected.length : null,
    p95CallDurationMs: percentile(
      selected.filter(span => !attribute(span, 'mcp.task.id')).map(span => span.duration_ms),
      0.95,
    ),
    taskSuccessRate: terminal.length > 0 ? completed / terminal.length : null,
    p95SandboxLaunchSeconds: {},
    samples: { calls: selected.length, tasks: terminal.length, launches: 0 },
  };
};

/** The four SLIs and the catalog, for everyone or for one agent or organization. */
export const fetchMcpMetrics = async (
  token: string,
  filters: McpMetricsFilters = {},
  otelUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<McpMetricsSnapshot> => {
  const limit = filters.limit ?? 500;
  const names = Object.values(MCP_SLI_METRICS);
  const pages = await Promise.all(
    names.map(name =>
      queryMetrics(token, { metricName: name, serviceName: serviceNameFor(name), limit }, otelUrl),
    ),
  );
  const metrics: Partial<Record<McpMetricName, OtelMetric[]>> = {};
  names.forEach((name, index) => {
    metrics[name] = pages[index].data ?? [];
  });
  const scoped = Boolean(filters.agent || filters.org);
  const spans = scoped
    ? (await listTraces(token, { serviceName: MCP_GATEWAY_SERVICE_NAME, limit }, otelUrl)).data ?? []
    : [];
  return {
    filters,
    metrics,
    spans,
    slis: scoped ? summarizeRequestSpans(spans, filters) : summarizeMetricPoints(metrics, filters),
    readAt: new Date().toISOString(),
  };
};

/** A span with its children, as a tree reads. */
export interface McpSpanNode {
  span: OtelSpan;
  children: McpSpanNode[];
}

/** The spans of a trace as a tree, roots first, siblings by start time. */
export const spanTree = (spans: OtelSpan[]): McpSpanNode[] => {
  const nodes = new Map<string, McpSpanNode>();
  for (const span of spans) {
    nodes.set(span.span_id, { span, children: [] });
  }
  const roots: McpSpanNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.span.parent_span_id ? nodes.get(node.span.parent_span_id) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const byStart = (a: McpSpanNode, b: McpSpanNode) => a.span.start_time.localeCompare(b.span.start_time);
  const sort = (list: McpSpanNode[]) => {
    list.sort(byStart);
    list.forEach(node => sort(node.children));
  };
  sort(roots);
  return roots;
};

export interface McpRunTrace {
  taskUid: string;
  traceId: string;
  spans: OtelSpan[];
  tree: McpSpanNode[];
}

/** "Show me this run": the spans of the task's trace. A task without one has none yet. */
export const fetchRunTrace = async (
  token: string,
  task: Pick<McpTask, 'uid' | 'traceId'>,
  otelUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<McpRunTrace> => {
  if (!task.traceId) {
    return { taskUid: task.uid, traceId: '', spans: [], tree: [] };
  }
  const trace = await getTrace(token, task.traceId, otelUrl);
  const spans = trace.data ?? [];
  return { taskUid: task.uid, traceId: task.traceId, spans, tree: spanTree(spans) };
};

/**
 * The spans of one trace, named directly.
 *
 * A synchronous call has no task — it finished inside its own request — but
 * it does carry a trace, which is what the audit row records and what
 * "show me this call" means before durable execution exists.
 */
export const fetchTraceSpans = async (
  token: string,
  traceId: string,
  otelUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<McpRunTrace> => {
  if (!traceId) {
    return { taskUid: '', traceId: '', spans: [], tree: [] };
  }
  const trace = await getTrace(token, traceId, otelUrl);
  const spans = trace.data ?? [];
  return { taskUid: '', traceId, spans, tree: spanTree(spans) };
};

export interface McpRunLogs {
  taskUid: string;
  traceId: string;
  records: OtelLog[];
}

/** The log lines of a run, gateway and worker alike, by the trace they carry. */
export const fetchMcpLogs = async (
  token: string,
  task: Pick<McpTask, 'uid' | 'traceId'>,
  options: { limit?: number; severity?: string } = {},
  otelUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<McpRunLogs> => {
  if (!task.traceId) {
    return { taskUid: task.uid, traceId: '', records: [] };
  }
  const page = await queryLogs(
    token,
    { traceId: task.traceId, limit: options.limit ?? 200, severity: options.severity },
    otelUrl,
  );
  return { taskUid: task.uid, traceId: task.traceId, records: page.data ?? [] };
};
