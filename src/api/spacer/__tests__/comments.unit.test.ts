/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Comments on documents and notebooks (BENCHMARK.md, B4-01): read and written
 * on the item's route, changed and settled on the comment's, followed on a
 * websocket that carries the token.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn(async () => ({ success: true }));
vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: (options: unknown) => request(options),
}));

import {
  addComment,
  commentsChannelUrl,
  listComments,
  reopenComment,
  resolveComment,
  updateComment,
} from '../comments';

const options = { baseUrl: 'https://spacer.example/', token: 'token-1' };

const lastCall = () =>
  request.mock.calls[request.mock.calls.length - 1][0] as {
    url: string;
    method: string;
    body?: unknown;
    token?: string;
  };

const path = () => new URL(lastCall().url).pathname;

beforeEach(() => {
  request.mockClear();
});

describe('comments', () => {
  it('are read and written on their document or notebook', () => {
    void listComments(options, 'lexical', 'lex/1');
    expect([lastCall().method, path(), lastCall().token]).toEqual([
      'GET',
      '/api/spacer/v1/lexicals/lex%2F1/comments',
      'token-1',
    ]);
    void listComments(options, 'notebook', 'nb-1', 'resolved');
    expect(lastCall().url).toBe(
      'https://spacer.example/api/spacer/v1/notebooks/nb-1/comments?status=resolved',
    );
    const thread = { body: 'Why 40 s?', anchor: { cell_id: 'cell-3' } };
    void addComment(options, 'notebook', 'nb-1', thread);
    expect([lastCall().method, path(), lastCall().body]).toEqual([
      'POST',
      '/api/spacer/v1/notebooks/nb-1/comments',
      thread,
    ]);
  });

  it('are changed, resolved and reopened on their own route', () => {
    void updateComment(options, 'c-1', { assignee_uid: null });
    expect([lastCall().method, path(), lastCall().body]).toEqual([
      'PATCH',
      '/api/spacer/v1/comments/c-1',
      { assignee_uid: null },
    ]);
    void resolveComment(options, 'c-1', 'Expected: new tokenizer.');
    expect([lastCall().method, path(), lastCall().body]).toEqual([
      'POST',
      '/api/spacer/v1/comments/c-1/resolve',
      { resolution: 'Expected: new tokenizer.' },
    ]);
    void resolveComment(options, 'c-1');
    expect(lastCall().body).toEqual({});
    void reopenComment(options, 'c-1');
    expect([lastCall().method, path()]).toEqual([
      'POST',
      '/api/spacer/v1/comments/c-1/reopen',
    ]);
  });

  it('are followed on a websocket that carries the token', () => {
    expect(commentsChannelUrl(options, 'lex-1')).toBe(
      'wss://spacer.example/api/spacer/v1/comments/ws/lex-1?token=token-1',
    );
    expect(
      commentsChannelUrl({ baseUrl: 'http://localhost:9900' }, 'lex-1'),
    ).toBe('ws://localhost:9900/api/spacer/v1/comments/ws/lex-1');
  });
});
