/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which spans concern a service: those it did, and those done toward it — a
 * client span whose `peer.service` names it (the OpenTelemetry attribute for
 * the remote service a call goes to). One message between two services shows
 * in both: sent in one, received in the other.
 *
 * @module otel/live/filter
 */

import type { OtelSpan } from '../types';

/** The OpenTelemetry attribute naming the service a call goes to. */
export const PEER_SERVICE = 'peer.service';

/** Whether a span concerns a service: done by it, or toward it. */
export function spanConcerns(span: OtelSpan, service: string): boolean {
  return (
    span.service_name === service || span.attributes?.[PEER_SERVICE] === service
  );
}

/** The spans that concern a service; every span without one. */
export function spansOfService(
  spans: readonly OtelSpan[],
  service: string | undefined,
): OtelSpan[] {
  return service
    ? spans.filter(span => spanConcerns(span, service))
    : [...spans];
}
