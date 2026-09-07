/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The runs of one notebook, beside the notebook.
 *
 * A run outlives the call that started it, so the agent that asked is
 * usually gone — and the person who notices is the one looking at the
 * notebook. `/mcp/runs` lists every run they own; this answers the narrower
 * question they actually have in front of them: what is happening to *this*
 * notebook, right now.
 *
 * It lists rather than acts. Cancelling and answering live on the run's own
 * page, next to the output that gives the question its context; a second set
 * of buttons here would be a second implementation of the same two calls,
 * and a panel beside a notebook is a poor place to decide to stop something
 * you cannot see the output of.
 *
 * @module views/mcp/NotebookRuns
 */

import type { JSX } from 'react';
import {
  Heading,
  Label,
  Link,
  RelativeTime,
  Spinner,
  Text,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useNotebookTasks } from '../../hooks/useMcp';
import type { McpTask } from '../../models/McpTask';
import { RUN_STATUS_LOOK, isRunOver } from './RunDetail';
import { type McpRoutes } from './types';

/**
 * The runs worth a person's attention first.
 *
 * A notebook accumulates finished runs and keeps only one or two live ones,
 * so ordering by time alone buries the live ones under yesterday's. Waiting
 * first, then working, then whatever finished most recently — the same order
 * the Runs panel uses, for the same reason.
 */
export const orderedRuns = (tasks: McpTask[]): McpTask[] => {
  const rank = (task: McpTask): number => {
    if (task.status === 'input_required') {
      return 0;
    }
    return isRunOver(task.status) ? 2 : 1;
  };
  return [...tasks].sort(
    (left, right) =>
      rank(left) - rank(right) ||
      right.lastUpdatedAt.localeCompare(left.lastUpdatedAt),
  );
};

export interface NotebookRunsProps {
  /** The notebook whose runs these are. */
  notebookUid: string;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /** How many to draw; a rail, not a page. */
  limit?: number;
}

export const NotebookRuns = ({
  notebookUid,
  routes,
  limit = 20,
}: NotebookRunsProps): JSX.Element => {
  const runs = useNotebookTasks(notebookUid);
  const tasks = orderedRuns(runs.data?.items ?? []).slice(0, limit);

  if (runs.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Spinner size="small" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <Heading as="h3" sx={{ fontSize: 1 }}>
        Runs
      </Heading>
      {tasks.length === 0 ? (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          Nothing has run on this notebook yet. A tool call that outlives its
          request appears here while it runs.
        </Text>
      ) : (
        tasks.map(task => {
          const look = RUN_STATUS_LOOK[task.status];
          return (
            <Box
              key={task.uid}
              sx={{
                display: 'grid',
                gap: 1,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor:
                  task.status === 'input_required'
                    ? 'attention.emphasis'
                    : 'border.default',
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Label size="small" variant={look.variant}>
                  {look.label}
                </Label>
                <Text sx={{ fontSize: 0 }}>{task.tool || 'Run'}</Text>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Link
                  href={`${routes.runs}/${encodeURIComponent(task.uid)}`}
                  sx={{ fontFamily: 'mono', fontSize: 0 }}
                >
                  {task.uid.slice(0, 16)}…
                </Link>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  <RelativeTime datetime={task.lastUpdatedAt} />
                </Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default NotebookRuns;
