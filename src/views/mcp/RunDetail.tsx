/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * One run: what it is doing, what it has printed, and the two things a
 * person can do about it.
 *
 * A task is a tool call that outlived the request that asked for it, so the
 * client that started it is usually gone. This is where somebody comes back
 * to it — from another device, another session, or after closing the
 * notebook — which is why it reads from the task record rather than from
 * anything the caller held.
 *
 * **Cancelling stops the work, not just the record of it.** The gateway
 * interrupts the kernel and then gives the tool a moment to hand back what
 * the cell printed, so a run cancelled at minute nine of ten arrives here
 * with its nine minutes of output and the `KeyboardInterrupt` that ended it.
 * That is the reason the outputs are drawn for a cancelled run at all, and
 * the reason the button says "Cancel" rather than "Stop watching".
 *
 * **`input_required` is a run asking, not a run idling.** It has stopped and
 * will not move until somebody answers, so it is drawn as an open question
 * with the answer box beside it rather than as another status label.
 *
 * Live while it runs: `useTaskEvents` patches the task's cache entry from
 * the server's event stream, and `useTask` polls underneath as the fallback
 * for a proxy that will not hold a stream open.
 *
 * @module views/mcp/RunDetail
 */

import type { JSX } from 'react';
import { useState } from 'react';
import {
  Button,
  Heading,
  Label,
  Link,
  Spinner,
  Text,
  Textarea,
  RelativeTime,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useNavigate } from 'react-router-dom';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useAnswerTask,
  useCancelTask,
  useRunTrace,
  useTask,
  useTaskEvents,
} from '../../hooks/useMcp';
import { TraceTimelineSection } from './TraceTimeline';
import type { McpTask, McpTaskStatus } from '../../models/McpTask';
import type { McpSpanNode } from '../../api/mcp/observability';
import type { OtelSpan } from '../../api/otel/types';
import { type McpErrorStateFn, type McpRoutes } from './types';

/** How a run's status is drawn. Shared with the runs list. */
export const RUN_STATUS_LOOK: Record<
  McpTaskStatus,
  { label: string; variant: 'success' | 'attention' | 'secondary' | 'danger' }
> = {
  working: { label: 'Working', variant: 'success' },
  input_required: { label: 'Waiting on you', variant: 'attention' },
  completed: { label: 'Completed', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

/** Whether the run has stopped for good. */
export const isRunOver = (status: McpTaskStatus): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled';

/**
 * Everything the run has printed, as text.
 *
 * Two shapes reach here and both are the run's output: the streamed
 * `outputs`, and the `result` a finished tool returned. A cancelled run has
 * the first and usually the second — the partial output is promoted to the
 * result when it stops — so they are concatenated rather than chosen
 * between, and de-duplicated by text so a promoted partial is not printed
 * twice.
 */
export const outputTextOf = (task: McpTask): string => {
  const lines: string[] = [];
  for (const output of task.outputs ?? []) {
    if (output.text) {
      lines.push(output.text);
    }
  }
  const result = task.result;
  if (result && typeof result === 'object') {
    for (const part of result.content ?? []) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') {
        lines.push(text);
      }
    }
  }
  const seen = new Set<string>();
  return lines
    .filter(line => {
      if (seen.has(line)) {
        return false;
      }
      seen.add(line);
      return true;
    })
    .join('');
};

/**
 * A run for the documentation to draw: cancelled mid-flight, holding the
 * lines it printed before it stopped.
 *
 * Cancelled rather than completed on purpose. It is the state that shows
 * both halves of what this view is for — the output a run keeps when it is
 * stopped, and the reason it stopped — and it is the one a reader is most
 * likely to be looking at when they open the documentation.
 */
export const SAMPLE_RUN: McpTask = {
  uid: 'tsk_0980147b852244d098b04efd',
  status: 'cancelled',
  statusMessage: 'cancelled by the client',
  tool: 'execute_cell',
  notebookUid: '01KW96PZYRVKZXT8FS644GFD0D',
  cellId: 'fdcac494',
  initiatingUser: '01JV1VE1T5VG22Z05F6EFBMW8E',
  createdAt: '2026-09-07T12:00:00Z',
  lastUpdatedAt: '2026-09-07T12:00:22Z',
  outputs: [
    {
      index: 0,
      outputType: 'stream',
      text: 'tick 0\ntick 1\ntick 2\ntick 3\ntick 4\ntick 5\n',
    },
  ],
  result: {
    content: [{ type: 'text', text: 'tick 6\ntick 7\nKeyboardInterrupt\n' }],
  },
};

/**
 * The spans that run left behind, for the documentation to draw.
 *
 * The shape is the one a reader needs to recognise: the gateway's twenty-two
 * seconds are almost entirely the sandbox's, and the durable step between
 * them explains the gap. A timeline drawn from an empty trace would teach
 * nobody what the timeline is for.
 */
export const SAMPLE_TRACE: McpSpanNode[] = (() => {
  const at = (second: number, millisecond = 0): string =>
    new Date(Date.UTC(2026, 8, 7, 12, 0, second, millisecond)).toISOString();
  const span = (
    id: string,
    name: string,
    service: string,
    from: string,
    to: string,
  ): OtelSpan => ({
    trace_id: '4f7a1c9d2b8e40a5b6c3d1e0f9a8b7c6',
    span_id: id,
    span_name: name,
    service_name: service,
    kind: 'SPAN_KIND_INTERNAL',
    start_time: from,
    end_time: to,
    duration_ms: Date.parse(to) - Date.parse(from),
  });
  return [
    {
      span: span(
        '01',
        'mcp.tools/call execute_cell',
        'jupyter-mcp-server',
        at(0),
        at(22),
      ),
      children: [
        {
          span: span(
            '02',
            'mcp.authorize',
            'jupyter-mcp-server',
            at(0),
            at(0, 4),
          ),
          children: [],
        },
        {
          span: span(
            '03',
            'durable.workflow.start',
            'datalayer-durable',
            at(0, 120),
            at(0, 480),
          ),
          children: [
            {
              span: span(
                '04',
                'durable.step.execute',
                'datalayer-durable',
                at(0, 500),
                at(22),
              ),
              children: [
                {
                  span: span(
                    '05',
                    'runtimes.kernel.execute',
                    'datalayer-runtimes',
                    at(1, 200),
                    at(21, 900),
                  ),
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
})();

export interface RunDetailProps {
  /** The run to draw. */
  taskUid: string;
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /**
   * Draw `SAMPLE_RUN` instead of asking the server, for documentation.
   *
   * The real component with fixed data, rather than a screenshot or a copy:
   * a change to how a run is drawn reaches the documentation by itself, and
   * a change that breaks it breaks the build rather than going unnoticed
   * until somebody compares a picture.
   */
  mock?: boolean;
}

export const RunDetail = ({
  taskUid,
  errorState,
  routes,
  mock = false,
}: RunDetailProps): JSX.Element => {
  const navigate = useNavigate();
  const run = useTask(mock ? undefined : taskUid);
  const cancel = useCancelTask();
  const answer = useAnswerTask();
  // Asked for whatever the run's own trace holds; the hook itself stops
  // polling when the run reaches a terminal state, and asks for nothing at
  // all in `mock`.
  const trace = useRunTrace(mock ? undefined : taskUid, { enabled: !mock });
  const [reply, setReply] = useState('');

  // Live while it runs, and it ends itself when the run is over. Never for
  // the documentation's copy: it names a run that does not exist.
  useTaskEvents(taskUid, {
    enabled: !mock && Boolean(run.data) && !isRunOver(run.data!.status),
  });

  if (!mock && run.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(run.error, 'Run')}
        onRetry={() => run.refetch()}
      />
    );
  }

  if (!mock && (run.isLoading || !run.data)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Spinner />
      </Box>
    );
  }

  const task = mock ? SAMPLE_RUN : run.data!;
  const look = RUN_STATUS_LOOK[task.status];
  const over = isRunOver(task.status);
  const output = outputTextOf(task);

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      <Box>
        <Link
          href={routes.runs}
          onClick={event => {
            event.preventDefault();
            navigate(routes.runs);
          }}
          sx={{ fontSize: 0 }}
        >
          All runs
        </Link>
        <Heading as="h2" sx={{ fontSize: 3, mt: 1, mb: 1 }}>
          {task.tool || 'Run'}
        </Heading>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Label size="small" variant={look.variant}>
            {look.label}
          </Label>
          <Text sx={{ fontFamily: 'mono', fontSize: 0, color: 'fg.muted' }}>
            {task.uid}
          </Text>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            updated <RelativeTime datetime={task.lastUpdatedAt} />
          </Text>
        </Box>
        {task.statusMessage && (
          <Text as="p" sx={{ fontSize: 1, color: 'fg.muted', mt: 2 }}>
            {task.statusMessage}
          </Text>
        )}
      </Box>

      {/* A run that has stopped to ask. Drawn before the output, because it
          is the thing the person came here to do. */}
      {task.status === 'input_required' && (
        <Box
          sx={{
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'attention.emphasis',
            borderRadius: 2,
            p: 3,
            display: 'grid',
            gap: 2,
          }}
        >
          <Heading as="h3" sx={{ fontSize: 1 }}>
            This run is waiting on you
          </Heading>
          <Textarea
            aria-label="Your answer"
            value={reply}
            onChange={event => setReply(event.target.value)}
            placeholder="Your answer"
            rows={3}
          />
          <Box>
            <Button
              variant="primary"
              disabled={!reply.trim() || answer.isPending}
              onClick={() =>
                answer.mutate(
                  { taskUid: task.uid, input: { answer: reply } },
                  { onSuccess: () => setReply('') },
                )
              }
            >
              {answer.isPending ? 'Answering…' : 'Answer'}
            </Button>
          </Box>
        </Box>
      )}

      <Box>
        <Heading as="h3" sx={{ fontSize: 1, mb: 2 }}>
          Output
        </Heading>
        {output ? (
          <Box
            as="pre"
            sx={{
              fontFamily: 'mono',
              fontSize: 0,
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
              bg: 'canvas.subtle',
              borderRadius: 2,
              p: 3,
              m: 0,
            }}
          >
            {output}
          </Box>
        ) : (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            {over
              ? 'This run printed nothing.'
              : 'Nothing printed yet. Output appears here as it arrives.'}
          </Text>
        )}
      </Box>

      {task.error && (
        <Box>
          <Heading as="h3" sx={{ fontSize: 1, mb: 2 }}>
            Why it failed
          </Heading>
          <Text sx={{ fontFamily: 'mono', fontSize: 0, color: 'danger.fg' }}>
            {task.error}
          </Text>
        </Box>
      )}

      {/* What the run spent its time on, across every service that touched
          it. After the output, because the output is what somebody came for
          and this is why it took as long as it did. */}
      <TraceTimelineSection
        tree={mock ? SAMPLE_TRACE : (trace.data?.tree ?? [])}
        traceId={mock ? SAMPLE_TRACE[0].span.trace_id : trace.data?.traceId}
        live={!over}
      />

      {/* Only while there is something to stop. Cancelling a run that has
          already finished is not an error, but offering it invites a person
          to think they stopped something they did not. */}
      {!over && (
        <Box>
          <Button
            variant="danger"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(task.uid)}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel this run'}
          </Button>
          <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', mt: 2 }}>
            Cancelling interrupts the work itself, so the sandbox stops being
            billed for it. What it has already printed is kept.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default RunDetail;
