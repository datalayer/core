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
import { useMcpMetrics, useMcpTrace, useRunTrace } from '../../hooks/useMcp';
import { useNavigate } from '../../hooks';
import { MCP_METRIC_CATALOG } from '../../api/mcp';
import type { McpSpanNode } from '../../api/mcp';
import { durationLabel } from './format';
import { type McpErrorStateFn, type McpRoutes } from './types';

export type McpObservabilityPane = 'runs' | 'metrics';

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

/** The gateway's own spans, so the tree can call out what each stage cost. */
const STAGE = (name: string): string => {
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
  return '';
};

const SpanRow = ({
  node,
  depth,
}: {
  node: McpSpanNode;
  depth: number;
}): JSX.Element => {
  const stage = STAGE(node.span.span_name);
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
              <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                The workflow steps and the sandbox launch of a durable task join
                this tree with milestone 2, and so does the live stream of calls
                as they land.
              </Text>
            </Box>
          )}
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
