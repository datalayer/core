/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  answerTask,
  cancelTask,
  getTask,
  isMcpTaskTerminal,
  listNotebookTasks,
  listTasks,
  parseTaskEventFrame,
  subscribeTaskEvents,
  taskEventsUrl,
} from '../tasks';

const BASE = 'https://mcp.test/mcp';
const TASK = '01TASK000000000000000000000';

const wireTask = (status = 'working') => ({
  uid: TASK,
  status,
  tool: 'execute_cell',
  notebook_uid: '01NB',
  cell_id: 'c1',
  sandbox_binding_uid: 'sb_1',
  initiating_user: '01USER',
  initiating_client: 'https://claude.ai/.well-known/mcp-client.json',
  created_at: '2026-08-27T10:00:00Z',
  last_updated_at: '2026-08-27T10:00:01Z',
  trace_id: 'abc',
  result: null,
});

describe('MCP tasks API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists tasks with the filters as query parameters', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ items: [wireTask()], next_cursor: 'c2' });

    const page = await listTasks('token', { status: 'working', notebook: '01NB', limit: 10 }, BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://mcp.test/api/mcp/v1/tasks?notebook=01NB&status=working&limit=10',
        method: 'GET',
      }),
    );
    expect(page.nextCursor).toBe('c2');
    expect(page.items[0].sandboxBindingUid).toBe('sb_1');
    expect(page.items[0].initiatingClient).toContain('claude.ai');
  });

  it('reads and cancels one task; cancel is a DELETE', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce(wireTask())
      .mockResolvedValueOnce(wireTask('cancelled'));

    const task = await getTask('token', TASK, BASE);
    const cancelled = await cancelTask('token', TASK, BASE);

    expect(task.status).toBe('working');
    expect(isMcpTaskTerminal(task.status)).toBe(false);
    expect(cancelled.status).toBe('cancelled');
    expect(isMcpTaskTerminal(cancelled.status)).toBe(true);
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: `https://mcp.test/api/mcp/v1/tasks/${TASK}`, method: 'DELETE' }),
    );
  });

  it('answers an input_required task with an idempotency key and the input as typed', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue(wireTask('working'));

    await answerTask('token', TASK, { input: { confirm_delete: true } }, 'answer-1', BASE);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://mcp.test/api/mcp/v1/tasks/${TASK}/input`,
        method: 'POST',
        headers: { 'Idempotency-Key': 'answer-1' },
        body: { input: { confirm_delete: true } },
      }),
    );
  });

  it('lists the tasks of a notebook', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ items: [] });

    const page = await listNotebookTasks('token', '01NB', { status: 'completed' }, BASE);

    expect(page.items).toEqual([]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://mcp.test/api/mcp/v1/notebooks/01NB/tasks?status=completed',
      }),
    );
  });

  it('parses an SSE frame into a task event', () => {
    const event = parseTaskEventFrame(
      'event: status\ndata: {"task_id": "01T", "status": "completed", "status_message": "done"}',
    );
    expect(event).toEqual({
      event: 'status',
      taskId: '01T',
      status: 'completed',
      statusMessage: 'done',
    });
    expect(parseTaskEventFrame(': keep-alive')).toBeUndefined();
    expect(taskEventsUrl(TASK, BASE)).toBe(`https://mcp.test/api/mcp/v1/tasks/${TASK}/events`);
  });

  describe('subscribeTaskEvents', () => {
    const originalFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('reads frames off the stream with a bearer token and closes when it ends', async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const text =
            'event: status\ndata: {"task_id": "01T", "status": "working"}\n\n' +
            'event: status\ndata: {"task_id": "01T", "status": "completed"}\n\n';
          controller.enqueue(Uint8Array.from(new TextEncoder().encode(text)));
          controller.close();
        },
      });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body });
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      const events: string[] = [];
      const closed = new Promise<void>(resolve => {
        subscribeTaskEvents(
          'token',
          '01T',
          { onEvent: event => events.push(event.status ?? ''), onClose: resolve },
          BASE,
        );
      });
      await closed;
      expect(events).toEqual(['working', 'completed']);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://mcp.test/api/mcp/v1/tasks/01T/events',
        expect.objectContaining({
          headers: { Authorization: 'Bearer token', Accept: 'text/event-stream' },
        }),
      );
    });

    it('reports a refused stream as an error', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden', body: null }) as unknown as typeof fetch;
      const error = await new Promise<Error>(resolve => {
        subscribeTaskEvents('token', '01T', { onEvent: () => undefined, onError: resolve }, BASE);
      });
      expect(error.message).toContain('403');
    });
  });
});
