/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A tracer that lives in the page: spans started and ended in the browser,
 * kept as the OTEL views draw them (`OtelSpan`), as they happen — a span is
 * there from its start (`in_progress`), its events added as they come, its
 * end and status when it ends.
 *
 * What it records is OpenTelemetry: W3C trace and span ids, a span kind, a
 * status, attributes of primitive values (structured values as JSON text, as
 * the GenAI semantic conventions carry arguments and results), events, and an
 * `exception` event for an error. Nothing is sent anywhere: the record is the
 * page's, read by `useOtelLiveSpans` and drawn by `OtelLiveSpans`.
 *
 * A span started without a parent continues the innermost span still open
 * of the same service — what one agent of the page is doing — so a tool call
 * nests under its turn without the caller carrying a context; `parent: null`
 * starts a trace of its own.
 *
 * @module otel/live/tracer
 */

import type { OtelSpan, OtelSpanEvent, OtelSpanLink } from '../types';

/** What identifies a span: its trace and itself. */
export interface OtelSpanContext {
  trace_id: string;
  span_id: string;
}

/** An attribute's value, as OpenTelemetry allows it. */
export type OtelAttributeValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | readonly boolean[];

/** Attributes; an `undefined` value is left out. */
export type OtelAttributes = Record<string, OtelAttributeValue | undefined>;

/** A span's kind, as the OTEL views name it. */
export type OtelSpanKindName =
  'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';

export interface OtelStartSpanOptions {
  /** The service that does it: the tracer's own unless said. */
  serviceName?: string;
  kind?: OtelSpanKindName;
  attributes?: OtelAttributes;
  /**
   * The span it is part of. Left out: the innermost span still open of the
   * same service; `null`: a trace of its own.
   */
  parent?: OtelSpanContext | null;
  /** When it started, in ms since the epoch: now unless said. */
  startTime?: number;
  /** The instrumentation scope: the tracer's own unless said. */
  scopeName?: string;
  links?: OtelSpanLink[];
}

/** A span being recorded. */
export interface OtelLiveSpan {
  readonly context: OtelSpanContext;
  /** Whether it has ended. */
  readonly ended: boolean;
  setAttribute(key: string, value: OtelAttributeValue | undefined): void;
  setAttributes(attributes: OtelAttributes): void;
  addEvent(name: string, attributes?: OtelAttributes, time?: number): void;
  setStatus(code: 'OK' | 'ERROR', message?: string): void;
  /** An `exception` event, and the status `ERROR`. */
  recordException(error: unknown, time?: number): void;
  updateName(name: string): void;
  /** End it; a second end is ignored. */
  end(time?: number): void;
}

/** The record, saved. */
export interface OtelLiveExport {
  exportedAt: string;
  spans: OtelSpan[];
}

export interface OtelLiveTracer {
  /** The service a span is done by unless it says. */
  readonly serviceName: string;
  startSpan(name: string, options?: OtelStartSpanOptions): OtelLiveSpan;
  /** The innermost span still open of a service (the tracer's own unless said). */
  activeSpan(serviceName?: string): OtelSpanContext | undefined;
  /** The spans, oldest first: a new array each time one changes. */
  spans(): readonly OtelSpan[];
  subscribe(listener: () => void): () => void;
  /** Forget every span; those still open are recorded no more. */
  clear(): void;
  exportSpans(): OtelLiveExport;
}

export interface OtelLiveTracerOptions {
  serviceName?: string;
  scopeName?: string;
  /** The clock: `Date.now` unless a test sets it. */
  now?: () => number;
  /** The most spans kept: the oldest ended ones go first. Default 2000. */
  limit?: number;
  /** Random bytes as hex, for ids: `crypto.getRandomValues` unless a test sets it. */
  randomHex?: (bytes: number) => string;
}

/** Random bytes as lowercase hex. */
function cryptoHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < bytes; index += 1) {
      values[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(values, value => value.toString(16).padStart(2, '0')).join(
    '',
  );
}

/** A W3C `traceparent` header for a span: `00-<trace>-<span>-01`. */
export function traceparentOf(context: OtelSpanContext): string {
  return `00-${context.trace_id}-${context.span_id}-01`;
}

/** Attributes without their `undefined` values. */
function defined(
  attributes: OtelAttributes | undefined,
): Record<string, OtelAttributeValue> {
  const kept: Record<string, OtelAttributeValue> = {};
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value !== undefined) {
      kept[key] = value;
    }
  }
  return kept;
}

/** Make a tracer for the page. */
export function createOtelLiveTracer(
  options: OtelLiveTracerOptions = {},
): OtelLiveTracer {
  const serviceName = options.serviceName ?? 'browser';
  const scopeName = options.scopeName ?? '@datalayer/core/otel/live';
  const now = options.now ?? Date.now;
  const limit = options.limit ?? 2000;
  const randomHex = options.randomHex ?? cryptoHex;
  const iso = (ms: number) => new Date(ms).toISOString();

  let list: OtelSpan[] = [];
  /** The spans still open, by service, innermost last. */
  const open = new Map<string, string[]>();
  const listeners = new Set<() => void>();
  let scheduled = false;
  /** Bumped by `clear`: a span started before it is recorded no more. */
  let generation = 0;

  const notify = () => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      listeners.forEach(listener => listener());
    });
  };

  const trim = () => {
    let excess = list.length - limit;
    if (excess <= 0) {
      return;
    }
    list = list.filter(span => {
      if (excess > 0 && !span.in_progress) {
        excess -= 1;
        return false;
      }
      return true;
    });
  };

  const closeOpen = (service: string, spanId: string) => {
    const stack = open.get(service);
    if (!stack) {
      return;
    }
    const kept = stack.filter(id => id !== spanId);
    if (kept.length) {
      open.set(service, kept);
    } else {
      open.delete(service);
    }
  };

  const tracer: OtelLiveTracer = {
    serviceName,
    startSpan(name, start = {}) {
      const service = start.serviceName ?? serviceName;
      const parent =
        start.parent === undefined
          ? tracer.activeSpan(service)
          : (start.parent ?? undefined);
      const context: OtelSpanContext = {
        trace_id: parent?.trace_id ?? randomHex(16),
        span_id: randomHex(8),
      };
      const startedAt = start.startTime ?? now();
      const born = generation;
      let current: OtelSpan = {
        trace_id: context.trace_id,
        span_id: context.span_id,
        ...(parent ? { parent_span_id: parent.span_id } : {}),
        span_name: name,
        service_name: service,
        kind: start.kind ?? 'INTERNAL',
        start_time: iso(startedAt),
        end_time: iso(startedAt),
        duration_ms: 0,
        status_code: 'UNSET',
        otel_scope_name: start.scopeName ?? scopeName,
        attributes: defined(start.attributes),
        events: [],
        ...(start.links?.length ? { links: start.links } : {}),
        in_progress: true,
      };
      list = [...list, current];
      trim();
      open.set(service, [...(open.get(service) ?? []), context.span_id]);
      notify();

      let ended = false;
      const change = (next: Partial<OtelSpan>) => {
        if (born !== generation) {
          return;
        }
        const updated: OtelSpan = { ...current, ...next };
        list = list.map(span => (span === current ? updated : span));
        current = updated;
        notify();
      };
      const span: OtelLiveSpan = {
        context,
        get ended() {
          return ended;
        },
        setAttribute(key, value) {
          span.setAttributes({ [key]: value });
        },
        setAttributes(attributes) {
          if (ended) {
            return;
          }
          change({
            attributes: { ...current.attributes, ...defined(attributes) },
          });
        },
        addEvent(eventName, attributes, time) {
          if (ended) {
            return;
          }
          const event: OtelSpanEvent = {
            name: eventName,
            timestamp: iso(time ?? now()),
            attributes: defined(attributes),
          };
          change({ events: [...(current.events ?? []), event] });
        },
        setStatus(code, message) {
          if (ended) {
            return;
          }
          change({
            status_code: code,
            ...(message ? { status_message: message } : {}),
          });
        },
        recordException(error, time) {
          const message =
            error instanceof Error ? error.message : String(error);
          span.addEvent(
            'exception',
            {
              'exception.type':
                error instanceof Error ? error.name : typeof error,
              'exception.message': message,
              'exception.stacktrace':
                error instanceof Error ? error.stack : undefined,
            },
            time,
          );
          span.setStatus('ERROR', message);
        },
        updateName(next) {
          if (!ended) {
            change({ span_name: next });
          }
        },
        end(time) {
          if (ended) {
            return;
          }
          ended = true;
          closeOpen(service, context.span_id);
          const endedAt = Math.max(time ?? now(), startedAt);
          change({
            end_time: iso(endedAt),
            duration_ms: endedAt - startedAt,
            in_progress: false,
          });
        },
      };
      return span;
    },
    activeSpan(service = serviceName) {
      const stack = open.get(service);
      const spanId = stack?.[stack.length - 1];
      const span = spanId
        ? list.find(candidate => candidate.span_id === spanId)
        : undefined;
      return span
        ? { trace_id: span.trace_id, span_id: span.span_id }
        : undefined;
    },
    spans() {
      return list;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      generation += 1;
      list = [];
      open.clear();
      notify();
    },
    exportSpans() {
      return { exportedAt: iso(now()), spans: [...list] };
    },
  };
  return tracer;
}
