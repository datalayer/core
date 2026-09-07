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
  useTask,
  useTaskEvents,
} from '../../hooks/useMcp';
import type { McpTask, McpTaskStatus } from '../../models/McpTask';
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

export interface RunDetailProps {
  /** The run to draw. */
  taskUid: string;
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
}

export const RunDetail = ({
  taskUid,
  errorState,
  routes,
}: RunDetailProps): JSX.Element => {
  const navigate = useNavigate();
  const run = useTask(taskUid);
  const cancel = useCancelTask();
  const answer = useAnswerTask();
  const [reply, setReply] = useState('');

  // Live while it runs, and it ends itself when the run is over.
  useTaskEvents(taskUid, { enabled: Boolean(run.data) && !isRunOver(run.data!.status) });

  if (run.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(run.error, 'Run')}
        onRetry={() => run.refetch()}
      />
    );
  }

  if (run.isLoading || !run.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Spinner />
      </Box>
    );
  }

  const task = run.data;
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
