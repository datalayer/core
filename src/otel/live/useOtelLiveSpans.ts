/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A live tracer's spans, kept current in a component.
 *
 * @module otel/live/useOtelLiveSpans
 */

import { useState, useSyncExternalStore } from 'react';
import type { OtelSpan } from '../types';
import { createOtelLiveTracer, type OtelLiveTracer } from './tracer';

const NO_SPANS: readonly OtelSpan[] = [];
const NO_SUBSCRIPTION = () => () => undefined;

/** A tracer's spans, kept current; none without a tracer. */
export function useOtelLiveSpans(
  tracer: OtelLiveTracer | null | undefined,
): readonly OtelSpan[] {
  return useSyncExternalStore(
    tracer ? tracer.subscribe : NO_SUBSCRIPTION,
    () => (tracer ? tracer.spans() : NO_SPANS),
    () => (tracer ? tracer.spans() : NO_SPANS),
  );
}

/** A tracer made once for a component (or the one given). */
export function useOtelLiveTracer(
  given?: OtelLiveTracer | null,
  serviceName?: string,
): OtelLiveTracer {
  const [own] = useState(() => given ?? createOtelLiveTracer({ serviceName }));
  return given ?? own;
}
