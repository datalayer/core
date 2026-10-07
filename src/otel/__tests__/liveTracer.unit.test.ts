/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The page's tracer: spans recorded from their start, nested under the
 * innermost open span of their service, their events and status, an error as
 * an `exception` event, the oldest ended spans dropped first, a clear that
 * forgets spans still open; and which spans concern a service.
 *
 * @module otel/__tests__/liveTracer.unit.test
 */

import { describe, expect, it } from 'vitest';
import {
  createOtelLiveTracer,
  spanConcerns,
  spansOfService,
  traceparentOf,
} from '../live';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function counter() {
  let next = 0;
  return (bytes: number) => {
    next += 1;
    return next.toString(16).padStart(bytes * 2, '0');
  };
}

describe('createOtelLiveTracer', () => {
  it('records a span from its start to its end, as the OTEL views draw it', () => {
    let now = 1_000;
    const tracer = createOtelLiveTracer({
      serviceName: 'Sales',
      now: () => now,
      randomHex: counter(),
    });
    const span = tracer.startSpan('chat gpt-x', {
      kind: 'CLIENT',
      attributes: { 'gen_ai.operation.name': 'chat', skipped: undefined },
    });
    const [started] = tracer.spans();
    expect(started).toMatchObject({
      span_name: 'chat gpt-x',
      service_name: 'Sales',
      kind: 'CLIENT',
      in_progress: true,
      duration_ms: 0,
      status_code: 'UNSET',
      attributes: { 'gen_ai.operation.name': 'chat' },
    });
    expect(started.trace_id).toHaveLength(32);
    expect(started.span_id).toHaveLength(16);
    expect(started.parent_span_id).toBeUndefined();

    span.setAttributes({ 'gen_ai.usage.input_tokens': 12 });
    span.addEvent('gen_ai.choice', { index: 0 });
    span.setStatus('OK');
    now = 1_412;
    span.end();
    span.end(9_999);
    const [ended] = tracer.spans();
    expect(ended).toMatchObject({
      in_progress: false,
      duration_ms: 412,
      status_code: 'OK',
      start_time: new Date(1_000).toISOString(),
      end_time: new Date(1_412).toISOString(),
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.usage.input_tokens': 12,
      },
    });
    expect(ended.events).toEqual([
      {
        name: 'gen_ai.choice',
        timestamp: new Date(1_000).toISOString(),
        attributes: { index: 0 },
      },
    ]);
    // Ended: nothing more is recorded.
    span.setAttribute('late', 1);
    expect(tracer.spans()[0].attributes).not.toHaveProperty('late');
  });

  it('nests a span under the innermost open span of its service', () => {
    const tracer = createOtelLiveTracer({ serviceName: 'Sales' });
    const turn = tracer.startSpan('invoke_agent Sales', { parent: null });
    const tool = tracer.startSpan('execute_tool ask_accounting');
    const peer = tracer.startSpan('execute_tool list_invoices', {
      serviceName: 'Accounting',
      parent: tool.context,
    });
    const other = tracer.startSpan('invoke_agent Accounting', {
      serviceName: 'Accounting',
      parent: null,
    });
    expect(tracer.activeSpan()).toEqual(tool.context);
    tool.end();
    expect(tracer.activeSpan()).toEqual(turn.context);
    const byName = Object.fromEntries(
      tracer.spans().map(span => [span.span_name, span]),
    );
    expect(byName['execute_tool ask_accounting'].parent_span_id).toBe(
      turn.context.span_id,
    );
    expect(byName['execute_tool ask_accounting'].trace_id).toBe(
      turn.context.trace_id,
    );
    expect(byName['execute_tool list_invoices'].parent_span_id).toBe(
      tool.context.span_id,
    );
    expect(byName['invoke_agent Accounting'].parent_span_id).toBeUndefined();
    expect(other.context.trace_id).not.toBe(turn.context.trace_id);
    peer.end();
    turn.end();
    expect(tracer.activeSpan()).toBeUndefined();
  });

  it('records an error as an exception event and the status ERROR', () => {
    const tracer = createOtelLiveTracer();
    const span = tracer.startSpan('a2a SendStreamingMessage');
    span.recordException(new TypeError('Failed to fetch'));
    span.end();
    const [failed] = tracer.spans();
    expect(failed.status_code).toBe('ERROR');
    expect(failed.status_message).toBe('Failed to fetch');
    expect(failed.events?.[0]).toMatchObject({
      name: 'exception',
      attributes: {
        'exception.type': 'TypeError',
        'exception.message': 'Failed to fetch',
      },
    });
  });

  it('keeps its newest spans, dropping the oldest ended ones first', () => {
    const tracer = createOtelLiveTracer({ limit: 3 });
    const open = tracer.startSpan('open', { parent: null });
    for (let index = 0; index < 4; index += 1) {
      tracer.startSpan(`s${index}`, { parent: null }).end();
    }
    expect(tracer.spans().map(span => span.span_name)).toEqual([
      'open',
      's2',
      's3',
    ]);
    open.end();
  });

  it('tells its listeners once per batch of changes, and forgets on clear', async () => {
    const tracer = createOtelLiveTracer();
    let calls = 0;
    const unsubscribe = tracer.subscribe(() => {
      calls += 1;
    });
    const span = tracer.startSpan('a');
    span.setAttribute('x', 1);
    span.addEvent('e');
    await flush();
    expect(calls).toBe(1);
    tracer.clear();
    span.setAttribute('y', 2);
    span.end();
    await flush();
    expect(tracer.spans()).toEqual([]);
    expect(tracer.activeSpan()).toBeUndefined();
    unsubscribe();
    expect(tracer.exportSpans().spans).toEqual([]);
  });

  it('says its span as a W3C traceparent', () => {
    expect(
      traceparentOf({ trace_id: 'a'.repeat(32), span_id: 'b'.repeat(16) }),
    ).toBe(`00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`);
  });
});

describe('spanConcerns', () => {
  it('keeps what a service did and the calls made toward it', () => {
    const tracer = createOtelLiveTracer({ serviceName: 'Sales' });
    tracer
      .startSpan('a2a SendStreamingMessage', {
        kind: 'CLIENT',
        attributes: { 'peer.service': 'Accounting' },
      })
      .end();
    tracer
      .startSpan('execute_tool list_invoices', { serviceName: 'Accounting' })
      .end();
    tracer.startSpan('invoke_agent Sales', { parent: null }).end();
    const spans = tracer.spans();
    expect(spansOfService(spans, 'Accounting').map(s => s.span_name)).toEqual([
      'a2a SendStreamingMessage',
      'execute_tool list_invoices',
    ]);
    expect(spansOfService(spans, 'Sales').map(s => s.span_name)).toEqual([
      'a2a SendStreamingMessage',
      'invoke_agent Sales',
    ]);
    expect(spansOfService(spans, undefined)).toHaveLength(3);
    expect(spanConcerns(spans[1], 'Sales')).toBe(false);
  });
});
