/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What `requestDatalayerAPI` hands `fetch`, and what it makes of the answer.
 *
 * The transport is the one place every API module goes through, so the
 * contract lives here: the headers a request carries, how a body is sent,
 * how the body of the answer is read, and which error a caller gets for a
 * refusal as against a server that could not be reached.
 *
 * @module api/__tests__/requestDatalayerAPI.unit
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NetworkError,
  RunResponseError,
  requestDatalayerAPI,
  requestDatalayerAPIWithResponse,
} from '../DatalayerApi';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

/** The one call `fetch` received, as the URL and the init it was given. */
function sentRequest(): { url: string; init: RequestInit; headers: Headers } {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('a JSON GET', () => {
  it('carries the token, the cache headers and the credentials', async () => {
    fetchMock.mockResolvedValue(
      json({ hello: 'world' }, 200, { etag: '"v1"' }),
    );

    const response = await requestDatalayerAPIWithResponse({
      url: 'https://example.test/api/thing',
      token: 'tok',
    });

    const { url, init, headers } = sentRequest();
    expect(url).toBe('https://example.test/api/thing');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    expect(init.body).toBeUndefined();
    expect(headers.get('authorization')).toBe('Bearer tok');
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('cache-control')).toBe(
      'no-store, no-cache, must-revalidate',
    );
    expect(headers.get('pragma')).toBe('no-cache');
    expect(response.data).toEqual({ hello: 'world' });
    expect(response.status).toBe(200);
    expect(response.headers.etag).toBe('"v1"');
  });

  it('sends no Authorization header without a token', async () => {
    fetchMock.mockResolvedValue(json({}));
    await requestDatalayerAPI({ url: 'https://example.test/api/open' });
    expect(sentRequest().headers.has('authorization')).toBe(false);
  });

  it('keeps the headers the caller set', async () => {
    fetchMock.mockResolvedValue(json({}));
    await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
      headers: { Accept: 'text/csv', 'Cache-Control': 'max-age=0' },
    });
    const { headers } = sentRequest();
    expect(headers.get('accept')).toBe('text/csv');
    expect(headers.get('cache-control')).toBe('max-age=0');
  });

  it('passes the signal through', async () => {
    fetchMock.mockResolvedValue(json({}));
    const controller = new AbortController();
    await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
      signal: controller.signal,
    });
    expect(sentRequest().init.signal).toBe(controller.signal);
  });

  it('hands back the text when the answer is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('plain', { status: 200 }));
    await expect(
      requestDatalayerAPI({ url: 'https://example.test/api/thing' }),
    ).resolves.toBe('plain');
  });
});

describe('a JSON POST', () => {
  it('stringifies the body and says so in Content-Type', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }, 201));
    await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
      method: 'POST',
      token: 'tok',
      body: { name: 'x' },
    });
    const { init, headers } = sentRequest();
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"x"}');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.has('cache-control')).toBe(false);
  });

  it('sends raw bytes as they are', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    const bytes = new Uint8Array([1, 2, 3]);
    await requestDatalayerAPI({
      url: 'https://example.test/api/part',
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
    });
    const { init, headers } = sentRequest();
    expect(init.body).toBe(bytes);
    expect(headers.get('content-type')).toBe('application/octet-stream');
  });
});

describe('a FormData POST', () => {
  it('sends the form as it is, with no Content-Type of its own', async () => {
    fetchMock.mockResolvedValue(json({ uid: 'u1' }));
    const form = new FormData();
    form.append('name', 'x');
    await requestDatalayerAPI({
      url: 'https://example.test/api/upload',
      method: 'POST',
      token: 'tok',
      body: form,
    });
    const { init, headers } = sentRequest();
    expect(init.body).toBe(form);
    // The browser adds multipart/form-data with its boundary; a Content-Type
    // set here would lack the boundary and the server could not parse it.
    expect(headers.has('content-type')).toBe(false);
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('authorization')).toBe('Bearer tok');
  });
});

describe('a refusal', () => {
  it('arrives as RunResponseError with the service message', async () => {
    fetchMock.mockResolvedValue(json({ message: 'No such thing' }, 404));
    const error = await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
    }).catch(e => e);
    expect(error).toBeInstanceOf(RunResponseError);
    expect(error.message).toBe('No such thing');
    expect(error.response.status).toBe(404);
  });

  it('reads a FastAPI detail when there is no message', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'Not found' }, 404));
    const error = await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
    }).catch(e => e);
    expect(error).toBeInstanceOf(RunResponseError);
    expect(error.message).toBe('Not found');
    expect(error.detail).toBe('Not found');
  });

  it('falls back to the status when the body is not JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('gone', { status: 502, statusText: 'Bad Gateway' }),
    );
    const error = await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
    }).catch(e => e);
    expect(error).toBeInstanceOf(RunResponseError);
    expect(error.message).toBe('Invalid response: 502 Bad Gateway');
  });
});

describe('a server that cannot be reached', () => {
  it('arrives as NetworkError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
    }).catch(e => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe('Failed to fetch');
  });

  it('leaves an abort as the abort it was', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    fetchMock.mockRejectedValue(abort);
    const error = await requestDatalayerAPI({
      url: 'https://example.test/api/thing',
    }).catch(e => e);
    expect(error).toBe(abort);
  });
});

describe('responseType', () => {
  it('blob hands back a Blob', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    );
    const data = await requestDatalayerAPI<Blob>({
      url: 'https://example.test/api/file',
      responseType: 'blob',
    });
    // By shape: the Blob `fetch` builds is not jsdom's `Blob`.
    expect(Object.prototype.toString.call(data)).toBe('[object Blob]');
    // Its size, not its bytes: CI's jsdom Blob has no arrayBuffer().
    expect(data.size).toBe(3);
  });

  it('arraybuffer hands back the bytes', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );
    const data = await requestDatalayerAPI<ArrayBuffer>({
      url: 'https://example.test/api/file',
      responseType: 'arraybuffer',
    });
    expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('text hands back the text unparsed', async () => {
    fetchMock.mockResolvedValue(new Response('{"a":1}', { status: 200 }));
    await expect(
      requestDatalayerAPI({
        url: 'https://example.test/api/export',
        responseType: 'text',
      }),
    ).resolves.toBe('{"a":1}');
  });
});

describe('a 202 with a Location', () => {
  it('polls the Location with GETs until the work is done', async () => {
    vi.useFakeTimers();
    try {
      fetchMock
        .mockResolvedValueOnce(
          new Response(null, {
            status: 202,
            headers: { Location: 'https://example.test/api/jobs/1' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(null, {
            status: 202,
            headers: { Location: 'https://example.test/api/jobs/1' },
          }),
        )
        .mockResolvedValueOnce(json({ done: true }));

      const pending = requestDatalayerAPI({
        url: 'https://example.test/api/jobs',
        method: 'POST',
        body: { run: 'it' },
      });
      await vi.advanceTimersByTimeAsync(1000 + 2000);
      await expect(pending).resolves.toEqual({ done: true });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [pollUrl, pollInit] = fetchMock.mock.calls[1] as [
        string,
        RequestInit,
      ];
      expect(pollUrl).toBe('https://example.test/api/jobs/1');
      expect(pollInit.method).toBe('GET');
      expect(pollInit.body).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
