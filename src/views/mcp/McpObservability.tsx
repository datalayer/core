/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * How a call ran, as opposed to whether it was allowed.
 *
 * Two panes over the Datalayer OTEL service, read directly with the
 * caller's token: **Runs**, the span tree of one call across the gateway,
 * the policy check and the worker, with the durations that matter called
 * out; and **Metrics**, the four service level indicators and the metric
 * catalog for the caller's agents or, for an owner, the organization.
 *
 * There is no gateway route behind this and no second store: the gateway
 * exports spans, metrics and logs through the collector the platform
 * already runs, and this page queries that. Which is exactly why the page
 * says on itself that it is telemetry — short retention, sampled, no
 * security claim. The audit log is the trail that answers "was this
 * allowed", and every pane links to it.
 *
 * Milestone 1 draws the two panes over synchronous calls. The workflow
 * steps and sandbox spans of a durable task, and the live stream of calls
 * as they land, arrive with milestone 2.
 *
 * @module views/mcp/McpObservability
 */

import type { JSX } from 'react';
import { useState } from 'react';
import {
  Button,
  Heading,
  Label,
  SegmentedControl,
  Spinner,
  Text,
  TextInput,
} from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { SearchIcon, TelescopeIcon } from '@primer/octicons-react';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useMcpMetrics,
  useMcpTrace,
  useMcpWorkflowsHealth,
  useRunTrace,
  useTasks,
} from '../../hooks/useMcp';
import type { McpWorkflowsHealth } from '../../api/mcp/operations';
import { TraceTimeline } from './TraceTimeline';
import { useNavigate } from '../../hooks';
import { MCP_METRIC_CATALOG } from '../../api/mcp';
import type { McpSpanNode } from '../../api/mcp';
import { durationLabel, timeAgo } from './format';
import { type McpErrorStateFn, type McpRoutes } from './types';

export type McpObservabilityPane = 'runs' | 'live' | 'metrics';

export interface McpObservabilityProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /** Which pane is open; the address owns it. */
  pane: McpObservabilityPane;
  onPaneChange: (pane: McpObservabilityPane) => void;
  /** The run to open, when the address names one. */
  taskUid?: string;
  /** The trace to open — what a synchronous call leaves behind. */
  traceId?: string;
  /** Asked to write a new selection into the address. */
  onSelect: (selection: { task?: string; trace?: string }) => void;
  /** One agent's reading, rather than every agent of the caller. */
  agent?: string;
  /** An owner's reading of one organization. */
  org?: string;
  showTitle?: boolean;
}

/**
 * What part of the platform a span belongs to, from its name.
 *
 * By prefix rather than by service, because one service emits spans for more
 * than one stage — the gateway does its own policy check — and because a
 * durable run's spans arrive from a process the gateway never talks to. A
 * name nothing recognises gets no label rather than a wrong one: the span is
 * still drawn, still timed, and still named.
 */
export const stageOf = (name: string): string => {
  if (name.startsWith('mcp.policy')) {
    return 'Policy';
  }
  if (name.startsWith('mcp.request')) {
    return 'Gateway';
  }
  if (name.startsWith('sandbox.')) {
    return 'Sandbox';
  }
  if (name.startsWith('durable.')) {
    return 'Workflow';
  }
  // The Runtimes service is where a sandbox is actually started and a kernel
  // actually executes; its spans are the ones that explain a run that spent
  // its eleven minutes somewhere other than this gateway.
  if (name.startsWith('runtimes.')) {
    return 'Runtime';
  }
  return '';
};

const SpanRow = ({
  node,
  depth,
}: {
  node: McpSpanNode;
  depth: number;
}): JSX.Element => {
  const stage = stageOf(node.span.span_name);
  const failed = (node.span.status_code ?? '').toUpperCase() === 'ERROR';
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1,
          pl: depth * 3,
          borderBottom: '1px solid',
          borderColor: 'border.muted',
          minWidth: 0,
        }}
      >
        <Text
          sx={{
            fontSize: 0,
            fontFamily: 'mono',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: failed ? 'danger.fg' : 'fg.default',
          }}
        >
          {node.span.span_name}
        </Text>
        {stage && (
          <Label size="small" variant="secondary">
            {stage}
          </Label>
        )}
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {node.span.service_name}
        </Text>
        <Text
          sx={{
            fontSize: 0,
            fontWeight: 'semibold',
            minWidth: 60,
            textAlign: 'right',
          }}
        >
          {durationLabel(node.span.duration_ms)}
        </Text>
      </Box>
      {node.children.map(child => (
        <SpanRow key={child.span.span_id} node={child} depth={depth + 1} />
      ))}
    </>
  );
};

/** A number the reader can act on, or a plain statement that it is not measured. */
const Sli = ({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}): JSX.Element => (
  <Box
    sx={{
      p: 3,
      border: '1px solid',
      borderColor: 'border.default',
      borderRadius: 2,
      minWidth: 0,
    }}
  >
    <Text sx={{ display: 'block', fontSize: 3, fontWeight: 'bold' }}>
      {value}
    </Text>
    <Text sx={{ display: 'block', fontSize: 0, color: 'fg.muted' }}>
      {label}
    </Text>
    {note && (
      <Text sx={{ display: 'block', fontSize: 0, color: 'fg.subtle' }}>
        {note}
      </Text>
    )}
  </Box>
);

/**
 * What the durable engine's own report amounts to, in one line.
 *
 * Three states, not two. "Unreachable" is deliberately not "unhealthy": the
 * gateway answers `/operations/workflows` even when it cannot reach the
 * engine, precisely so an operator can tell "the engine says it is unwell"
 * from "nobody could ask it" — the first is a problem with the engine, the
 * second is usually a problem with the network between them, and sending
 * somebody to the wrong one costs an hour.
 *
 * A healthy engine with a backlog is still healthy, and says so with the
 * backlog beside it: a queue is a queue, not a fault.
 */
export const engineLook = (
  health: McpWorkflowsHealth | undefined,
  failed: boolean,
): {
  label: string;
  variant: 'success' | 'attention' | 'danger' | 'secondary';
  note: string;
} => {
  if (failed) {
    return {
      label: 'Unreachable',
      variant: 'secondary',
      note: 'The gateway could not ask the durable engine how it is. That is a question about the network between them, not about the engine.',
    };
  }
  if (!health) {
    return { label: 'Asking…', variant: 'secondary', note: '' };
  }
  const backlog = (health.queues ?? []).reduce(
    (total, queue) => total + (queue.backlog ?? 0),
    0,
  );
  if (!health.healthy) {
    return {
      label: 'Unhealthy',
      variant: 'danger',
      note: health.detail || 'The engine reports itself unhealthy.',
    };
  }
  return {
    label: 'Healthy',
    variant: backlog > 0 ? 'attention' : 'success',
    note:
      backlog > 0
        ? `${backlog} ${backlog === 1 ? 'run is' : 'runs are'} waiting to be picked up.`
        : 'Nothing is waiting to be picked up.',
  };
};

const percentLabel = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? 'Not measured'
    : `${(value * 100).toFixed(1)}%`;

export const McpObservability = ({
  errorState,
  routes,
  pane,
  onPaneChange,
  taskUid,
  traceId,
  onSelect,
  agent,
  org,
  showTitle = true,
}: McpObservabilityProps): JSX.Element => {
  const navigate = useNavigate();
  const [find, setFind] = useState(taskUid ?? traceId ?? '');

  // One of the two, never both: a task names its own trace, and a trace
  // names itself.
  const byTask = useRunTrace(taskUid, { enabled: Boolean(taskUid) });
  const byTrace = useMcpTrace(traceId, {
    enabled: Boolean(traceId) && !taskUid,
  });
  const run = taskUid ? byTask : byTrace;
  const metrics = useMcpMetrics({ agent, org });
  // Only while the Live pane is open. A pane nobody is looking at should not
  // be asking the durable engine how it is every thirty seconds.
  const engine = useMcpWorkflowsHealth({ enabled: pane === 'live' });
  const live = useTasks({ status: 'working' }, { enabled: pane === 'live' });

  const telemetryNotice = (
    <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
      This is telemetry: spans and metrics are sampled, kept for a short time
      and meant for understanding how a call ran. It is not the record of what
      was allowed —{' '}
      <Text
        as="span"
        sx={{ color: 'accent.fg', cursor: 'pointer' }}
        onClick={() => navigate(routes.audit)}
      >
        the audit log
      </Text>{' '}
      is, and it is kept per plan and never changed.
    </Text>
  );

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            Observability
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            How the calls of your agents ran: where the time went, and how the
            service is behaving.
          </Text>
        </Box>
      )}

      <SegmentedControl aria-label="Observability panes" size="small">
        <SegmentedControl.Button
          selected={pane === 'runs'}
          onClick={() => onPaneChange('runs')}
        >
          Runs
        </SegmentedControl.Button>
        <SegmentedControl.Button
          selected={pane === 'live'}
          onClick={() => onPaneChange('live')}
        >
          Live
        </SegmentedControl.Button>
        <SegmentedControl.Button
          selected={pane === 'metrics'}
          onClick={() => onPaneChange('metrics')}
        >
          Metrics
        </SegmentedControl.Button>
      </SegmentedControl>

      {telemetryNotice}

      {pane === 'runs' && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <TextInput
              size="small"
              leadingVisual={SearchIcon}
              aria-label="Task or trace id"
              placeholder="Task uid or trace id"
              value={find}
              sx={{ minWidth: 320 }}
              onChange={event => setFind(event.currentTarget.value)}
            />
            <Button
              size="small"
              onClick={() => {
                const value = find.trim();
                if (!value) {
                  onSelect({});
                  return;
                }
                // A trace id is 32 hexadecimal characters; anything else is a
                // task uid, and the gateway tells us which by answering.
                onSelect(
                  /^[0-9a-f]{32}$/i.test(value)
                    ? { trace: value }
                    : { task: value },
                );
              }}
            >
              Show the run
            </Button>
          </Box>

          {!taskUid && !traceId ? (
            <Blankslate border spacious>
              <Blankslate.Visual>
                <TelescopeIcon size="medium" />
              </Blankslate.Visual>
              <Blankslate.Heading>Pick a run</Blankslate.Heading>
              <Blankslate.Description>
                <Text sx={{ textAlign: 'center' }}>
                  Open a call from the audit log or the dashboard, or paste its
                  task uid or trace id here, and its spans across the gateway,
                  the policy check and the worker appear with the time each
                  took.
                </Text>
              </Blankslate.Description>
              <Button size="small" onClick={() => navigate(routes.audit)}>
                Open the audit log
              </Button>
            </Blankslate>
          ) : run.isError ? (
            <McpErrorBlankslate
              state={errorState(run.error, 'This run')}
              onRetry={() => run.refetch()}
            />
          ) : run.isPending ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <Spinner />
            </Box>
          ) : (run.data?.spans.length ?? 0) === 0 ? (
            <Blankslate border spacious>
              <Blankslate.Visual>
                <TelescopeIcon size="medium" />
              </Blankslate.Visual>
              <Blankslate.Heading>No span for this call</Blankslate.Heading>
              <Blankslate.Description>
                <Text sx={{ textAlign: 'center' }}>
                  Spans reach the collector a few seconds after the call and are
                  kept for a short time. A call older than the retention window
                  has an audit row but no trace.
                </Text>
              </Blankslate.Description>
            </Blankslate>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 3,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Text
                  sx={{ fontSize: 0, color: 'fg.muted', fontFamily: 'mono' }}
                >
                  {run.data?.traceId}
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  {run.data?.spans.length} spans
                </Text>
                <Button
                  size="small"
                  onClick={() =>
                    navigate(
                      `${routes.audit}?trace=${encodeURIComponent(run.data?.traceId ?? '')}`,
                    )
                  }
                >
                  The audit row
                </Button>
              </Box>
              {/* The same drawing the Runs detail uses, so a person who
                  learned to read one can read the other. Proportional first,
                  because "which stage took the time" is the question, and the
                  named rows underneath for the detail. */}
              <TraceTimeline tree={run.data?.tree ?? []} />
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  overflowX: 'auto',
                }}
              >
                {(run.data?.tree ?? []).map(node => (
                  <SpanRow key={node.span.span_id} node={node} depth={0} />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {pane === 'live' && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {/* The engine first. A run that has not started is not slow — it is
              waiting on something, and this says whether that something is
              the engine. */}
          {(() => {
            const look = engineLook(engine.data, engine.isError);
            const queues = engine.data?.queues ?? [];
            return (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  p: 3,
                  display: 'grid',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Heading as="h3" sx={{ fontSize: 1 }}>
                    The durable engine
                  </Heading>
                  <Label size="small" variant={look.variant}>
                    {look.label}
                  </Label>
                  {engine.data?.engine && (
                    <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                      {engine.data.engine}
                    </Text>
                  )}
                </Box>
                {look.note && (
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    {look.note}
                  </Text>
                )}
                {queues.length > 0 && (
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    {queues.map(queue => (
                      <Box
                        key={queue.name}
                        sx={{
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                          fontSize: 0,
                        }}
                      >
                        <Text sx={{ fontFamily: 'mono' }}>{queue.name}</Text>
                        <Text sx={{ color: 'fg.muted' }}>
                          {queue.backlog} waiting
                        </Text>
                        {typeof queue.oldestWaitSeconds === 'number' && (
                          <Text sx={{ color: 'fg.muted' }}>
                            oldest{' '}
                            {durationLabel(queue.oldestWaitSeconds * 1000)}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })()}

          {/* Then what is actually running, which is what "live" means to
              somebody who is not an operator. Polled rather than streamed:
              the pane is refreshed by the hook itself every five seconds. */}
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Heading as="h3" sx={{ fontSize: 1 }}>
              Running now
            </Heading>
            {live.isError ? (
              <McpErrorBlankslate
                state={errorState(live.error, 'The running calls')}
                onRetry={() => live.refetch()}
              />
            ) : live.isPending ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Spinner />
              </Box>
            ) : (live.data?.items.length ?? 0) === 0 ? (
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                Nothing of yours is running. A call that finishes inside its own
                request never appears here — it is over before this pane could
                draw it — and is found by its trace in Runs.
              </Text>
            ) : (
              (live.data?.items ?? []).map(task => (
                <Box
                  key={task.uid}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'border.muted',
                  }}
                >
                  <Label size="small" variant="success">
                    Working
                  </Label>
                  <Text sx={{ fontSize: 0 }}>{task.tool || 'Run'}</Text>
                  <Text
                    sx={{
                      fontSize: 0,
                      fontFamily: 'mono',
                      color: 'accent.fg',
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelect({ task: task.uid })}
                  >
                    {task.uid}
                  </Text>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    started {timeAgo(task.createdAt)}
                  </Text>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}

      {pane === 'metrics' && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {metrics.isError ? (
            <McpErrorBlankslate
              state={errorState(metrics.error, 'Metrics')}
              onRetry={() => metrics.refetch()}
            />
          ) : metrics.isPending && !metrics.data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <Spinner />
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: [
                    '1fr',
                    'repeat(2, 1fr)',
                    'repeat(4, 1fr)',
                  ],
                }}
              >
                <Sli
                  label="Availability"
                  value={percentLabel(metrics.data?.slis.availability)}
                  note={`${metrics.data?.slis.samples.calls ?? 0} calls`}
                />
                <Sli
                  label="Call latency, p95"
                  value={
                    metrics.data?.slis.p95CallDurationMs === null ||
                    metrics.data?.slis.p95CallDurationMs === undefined
                      ? 'Not measured'
                      : durationLabel(metrics.data.slis.p95CallDurationMs)
                  }
                />
                <Sli
                  label="Task success"
                  value={percentLabel(metrics.data?.slis.taskSuccessRate)}
                  note={`${metrics.data?.slis.samples.tasks ?? 0} tasks`}
                />
                <Sli
                  label="Sandbox launch, p95"
                  value={
                    Object.keys(
                      metrics.data?.slis.p95SandboxLaunchSeconds ?? {},
                    ).length === 0
                      ? 'Not measured'
                      : Object.entries(
                          metrics.data?.slis.p95SandboxLaunchSeconds ?? {},
                        )
                          .map(
                            ([provider, seconds]) =>
                              `${provider} ${seconds.toFixed(1)}s`,
                          )
                          .join(' · ')
                  }
                  note={`${metrics.data?.slis.samples.launches ?? 0} launches`}
                />
              </Box>

              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  overflowX: 'auto',
                }}
              >
                {MCP_METRIC_CATALOG.map(name => {
                  const points = metrics.data?.metrics[name] ?? [];
                  const last = points[points.length - 1];
                  return (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        py: 1,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'border.muted',
                      }}
                    >
                      <Text sx={{ fontSize: 0, fontFamily: 'mono', flex: 1 }}>
                        {name}
                      </Text>
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        {points.length === 0
                          ? 'no point'
                          : `${points.length} points`}
                      </Text>
                      <Text
                        sx={{
                          fontSize: 0,
                          fontWeight: 'semibold',
                          minWidth: 80,
                          textAlign: 'right',
                        }}
                      >
                        {last
                          ? `${last.value}${last.unit ? ` ${last.unit}` : ''}`
                          : '—'}
                      </Text>
                    </Box>
                  );
                })}
              </Box>

              <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                Metrics carry no user, agent or organization label by design, so
                a per-agent reading is computed from the request spans, which
                do.
                {metrics.data?.spans.length
                  ? ` ${metrics.data.spans.length} spans read.`
                  : ''}
              </Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default McpObservability;
