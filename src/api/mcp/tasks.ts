/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Tasks of the Jupyter MCP Server: submitted by an agent, watched by anyone
 * allowed to see the notebook.
 *
 * `GET /tasks` pages with a cursor and filters on notebook, sandbox, agent
 * and status; `DELETE /tasks/{uid}` is cancel and is idempotent;
 * `POST /tasks/{uid}/input` is the REST face of `tasks/update`;
 * `GET /tasks/{uid}/events` is server-sent events carrying the same
 * `notifications/tasks` payloads the MCP subscription does.
 *
 * @module api/mcp/tasks
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { DEFAULT_SERVICE_URLS } from '../constants';
import { fromWire, mcpUrl } from './gateway';
import type {
  McpTask,
  McpTaskEvent,
  McpTaskInput,
  McpTaskList,
  McpTaskStatus,
} from '../../models/McpTask';

export {
  MCP_TERMINAL_TASK_STATUSES,
  isMcpTaskTerminal,
} from '../../models/McpTask';
export type {
  McpCallToolResult,
  McpTask,
  McpTaskEvent,
  McpTaskInput,
  McpTaskList,
  McpTaskOutput,
  McpTaskStatus,
  McpWorkflowEngine,
} from '../../models/McpTask';

export interface McpTaskListFilters {
  notebook?: string;
  sandbox?: string;
  /** The `client_id` of the agent, or a service agent's uid. */
  agent?: string;
  status?: McpTaskStatus;
  /** An owner's view of an organization. */
  org?: string;
  cursor?: string;
  limit?: number;
}

const taskUrl = (baseUrl: string, taskUid: string, suffix = ''): string =>
  mcpUrl(baseUrl, `/tasks/${encodeURIComponent(taskUid)}${suffix}`);

/** The filters in the gateway's order, so a key and an URL are stable. */
const taskQuery = (filters: McpTaskListFilters) => ({
  notebook: filters.notebook,
  sandbox: filters.sandbox,
  agent: filters.agent,
  status: filters.status,
  org: filters.org,
  cursor: filters.cursor,
  limit: filters.limit,
});

/** The caller's tasks, newest first; an owner narrows to an organization. */
export const listTasks = async (
  token: string,
  filters: McpTaskListFilters = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpTaskList> =>
  fromWire<McpTaskList>(
    await requestDatalayerAPI({
      url: mcpUrl(baseUrl, '/tasks', taskQuery(filters)),
      method: 'GET',
      token,
    }),
  );

export const getTask = async (
  token: string,
  taskUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpTask> =>
  fromWire<McpTask>(
    await requestDatalayerAPI({
      url: taskUrl(baseUrl, taskUid),
      method: 'GET',
      token,
    }),
  );

/** Stop a task that is still going. Idempotent: a finished task is answered as it is. */
export const cancelTask = async (
  token: string,
  taskUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpTask> =>
  fromWire<McpTask>(
    await requestDatalayerAPI({
      url: taskUrl(baseUrl, taskUid),
      method: 'DELETE',
      token,
    }),
  );

/**
 * Answer a task that is `input_required`.
 *
 * The input is the tool's own and goes over as typed; only the envelope is
 * converted. The idempotency key makes a retried answer one answer.
 */
export const answerTask = async (
  token: string,
  taskUid: string,
  request: McpTaskInput,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpTask> =>
  fromWire<McpTask>(
    await requestDatalayerAPI({
      url: taskUrl(baseUrl, taskUid, '/input'),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: { input: request.input },
    }),
  );

/** The tasks of one notebook; empty until milestone 2 fills it. */
export const listNotebookTasks = async (
  token: string,
  notebookUid: string,
  filters: Pick<McpTaskListFilters, 'status' | 'cursor' | 'limit'> = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): Promise<McpTaskList> =>
  fromWire<McpTaskList>(
    await requestDatalayerAPI({
      url: mcpUrl(
        baseUrl,
        `/notebooks/${encodeURIComponent(notebookUid)}/tasks`,
        taskQuery(filters),
      ),
      method: 'GET',
      token,
    }),
  );

/** Where a task's server-sent events are. */
export const taskEventsUrl = (
  taskUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): string => taskUrl(baseUrl, taskUid, '/events');

export interface McpTaskEventHandlers {
  onEvent: (event: McpTaskEvent) => void;
  onError?: (error: Error) => void;
  /** The stream ended: the task reached a terminal status or the server closed. */
  onClose?: () => void;
}

/**
 * One SSE frame as the gateway writes it: `event:` then `data:` lines, a
 * blank line between frames.
 */
export const parseTaskEventFrame = (frame: string): McpTaskEvent | undefined => {
  let event = 'message';
  const data: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice('data:'.length).replace(/^ /, ''));
    }
  }
  if (data.length === 0) {
    return undefined;
  }
  const payload = fromWire<Partial<McpTaskEvent>>(JSON.parse(data.join('\n')));
  return { ...payload, event: payload.event ?? event, taskId: payload.taskId ?? '' };
};

/**
 * Subscribe to a task's events.
 *
 * `EventSource` cannot carry a bearer token, so this reads the stream with
 * `fetch`. The returned function closes the subscription; the stream also
 * ends by itself when the task is terminal.
 */
export const subscribeTaskEvents = (
  token: string,
  taskUid: string,
  handlers: McpTaskEventHandlers,
  baseUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): (() => void) => {
  const controller = new AbortController();
  const run = async () => {
    const response = await fetch(taskEventsUrl(taskUid, baseUrl), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`Task events refused: ${response.status} ${response.statusText}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffered += decoder.decode(value, { stream: true });
      let boundary = buffered.indexOf('\n\n');
      while (boundary >= 0) {
        const frame = buffered.slice(0, boundary);
        buffered = buffered.slice(boundary + 2);
        const event = parseTaskEventFrame(frame);
        if (event) {
          handlers.onEvent(event);
        }
        boundary = buffered.indexOf('\n\n');
      }
    }
    const last = parseTaskEventFrame(buffered);
    if (last) {
      handlers.onEvent(last);
    }
  };
  run()
    .then(() => handlers.onClose?.())
    .catch((error: unknown) => {
      if (controller.signal.aborted) {
        handlers.onClose?.();
        return;
      }
      handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
    });
  return () => controller.abort();
};
