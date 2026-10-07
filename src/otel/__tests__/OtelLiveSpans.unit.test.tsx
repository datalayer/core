/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The live spans view: a tracer's spans as they happen (a running span said
 * so), one service's own, a span's mark and line, its detail with JSON text
 * unfolded, the facets, and a clear that empties one service's view only.
 *
 * @module otel/__tests__/OtelLiveSpans.unit.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider } from '@primer/react';
import type { OtelSpan } from '../types';
import { createOtelLiveTracer } from '../live';
import { OtelLiveSpans, filterSpansByFacets } from '../views/OtelLiveSpans';
import { unfoldedValue } from '../views/OtelSpanDetail';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const names = () =>
  [...container.querySelectorAll('[data-otel-span-name]')].map(row =>
    row.getAttribute('data-otel-span-name'),
  );

function team() {
  const tracer = createOtelLiveTracer({ serviceName: 'Sales' });
  const turn = tracer.startSpan('invoke_agent Sales', { parent: null });
  const ask = tracer.startSpan('a2a SendStreamingMessage', {
    kind: 'CLIENT',
    attributes: { 'peer.service': 'Accounting' },
  });
  const call = tracer.startSpan('execute_tool list_invoices', {
    serviceName: 'Accounting',
    parent: ask.context,
    attributes: {
      'gen_ai.tool.name': 'list_invoices',
      'gen_ai.tool.call.arguments': '{"kind":"customer"}',
    },
  });
  return { tracer, turn, ask, call };
}

describe('OtelLiveSpans', () => {
  it('draws the spans as they happen, a running one said so', async () => {
    const { tracer, turn, ask, call } = team();
    await act(async () =>
      root.render(
        <ThemeProvider>
          <OtelLiveSpans
            tracer={tracer}
            describeSpan={span =>
              span.attributes?.['gen_ai.tool.call.arguments'] as string
            }
            renderSpanMark={span =>
              span.span_name.startsWith('execute_tool') ? (
                <span data-mark="">🔧</span>
              ) : null
            }
          />
        </ThemeProvider>,
      ),
    );
    expect(names()).toEqual([
      'invoke_agent Sales',
      'a2a SendStreamingMessage',
      'execute_tool list_invoices',
    ]);
    expect(container.textContent).toContain('running');
    expect(container.querySelector('[data-mark]')).not.toBeNull();
    expect(
      container.querySelector('[data-otel-span-description]')?.textContent,
    ).toBe('{"kind":"customer"}');
    await act(async () => {
      call.end();
      ask.end();
      turn.end();
      await Promise.resolve();
    });
    expect(container.textContent).not.toContain('running');
    expect(container.querySelector('[data-otel-span-count]')?.textContent).toBe(
      '3 spans',
    );
  });

  it('shows one service its own: what it did and what was sent to it', async () => {
    const { tracer } = team();
    await act(async () =>
      root.render(
        <ThemeProvider>
          <OtelLiveSpans tracer={tracer} service="Accounting" compact />
        </ThemeProvider>,
      ),
    );
    expect(names()).toEqual([
      'a2a SendStreamingMessage',
      'execute_tool list_invoices',
    ]);
    // Clearing one service's view leaves the record whole.
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-otel-clear]')!.click(),
    );
    expect(names()).toEqual([]);
    expect(tracer.spans()).toHaveLength(3);
  });

  it('opens a span’s detail, its JSON arguments unfolded', async () => {
    const { tracer } = team();
    await act(async () =>
      root.render(
        <ThemeProvider>
          <OtelLiveSpans tracer={tracer} />
        </ThemeProvider>,
      ),
    );
    await act(async () =>
      container
        .querySelector<HTMLElement>(
          '[data-otel-span-name="execute_tool list_invoices"]',
        )!
        .click(),
    );
    const detail = container.querySelector('[data-otel-live-detail]');
    expect(detail?.textContent).toContain('gen_ai.tool.call.arguments');
    expect(detail?.textContent).toContain('customer');
  });

  it('clears the whole record when it shows all of it', async () => {
    const { tracer } = team();
    await act(async () =>
      root.render(
        <ThemeProvider>
          <OtelLiveSpans tracer={tracer} />
        </ThemeProvider>,
      ),
    );
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-otel-clear]')!.click();
      await Promise.resolve();
    });
    expect(tracer.spans()).toEqual([]);
  });
});

describe('filterSpansByFacets', () => {
  it('keeps the spans each facet keeps, an empty one keeping all', () => {
    const { tracer } = team();
    const facets = [
      { label: 'Service', value: (span: OtelSpan) => span.service_name },
      { label: 'Kind', value: (span: OtelSpan) => span.kind },
    ];
    const kept = filterSpansByFacets(tracer.spans(), facets, [
      new Set(['Sales']),
      new Set(),
    ]);
    expect(kept.map(span => span.span_name)).toEqual([
      'invoke_agent Sales',
      'a2a SendStreamingMessage',
    ]);
    expect(
      filterSpansByFacets(tracer.spans(), facets, [
        new Set(['Sales']),
        new Set(['CLIENT']),
      ]).map(span => span.span_name),
    ).toEqual(['a2a SendStreamingMessage']);
  });
});

describe('unfoldedValue', () => {
  it('reads JSON text of an object or an array, and leaves anything else', () => {
    expect(unfoldedValue('{"a":1}')).toEqual({ a: 1 });
    expect(unfoldedValue(' [1, 2]')).toEqual([1, 2]);
    expect(unfoldedValue('{not json')).toBe('{not json');
    expect(unfoldedValue('42')).toBe('42');
    expect(unfoldedValue(7)).toBe(7);
  });
});
