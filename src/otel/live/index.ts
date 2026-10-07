/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OpenTelemetry in the page: a tracer whose spans the OTEL views draw as
 * they happen, and which of them concern a service. Light: no view, no
 * client, nothing sent.
 *
 * @module otel/live
 */

export {
  createOtelLiveTracer,
  traceparentOf,
  type OtelAttributeValue,
  type OtelAttributes,
  type OtelLiveExport,
  type OtelLiveSpan,
  type OtelLiveTracer,
  type OtelLiveTracerOptions,
  type OtelSpanContext,
  type OtelSpanKindName,
  type OtelStartSpanOptions,
} from './tracer';
export { PEER_SERVICE, spanConcerns, spansOfService } from './filter';
export { useOtelLiveSpans, useOtelLiveTracer } from './useOtelLiveSpans';
