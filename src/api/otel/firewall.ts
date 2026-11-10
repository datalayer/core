/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A runtime's network firewall, read back from Datalayer's observability.
 *
 * The runtime pod's `shield-firewall` sidecar (agent-shield's firewall)
 * exports each rule it applies and each connection it allows or refuses as
 * a span. The OTEL service reads them for the runtime's owner only: it asks
 * the runtimes service for the runtime with the caller's own token first.
 *
 * @module api/otel/firewall
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';

/** One connection the firewall decided. */
export interface FirewallConnection {
  /** Unix nanoseconds, which a JavaScript number holds only approximately. */
  time_unix_nano: number;
  decision: 'allow' | 'refuse';
  /** The rule that decided, e.g. `spec:*`, `base:refused`, `spec:*_non-public`. */
  rule: string;
  /** `address:port`. */
  destination: string;
  /** The host the address was resolved from, when the firewall knows it. */
  host: string;
  port: number | null;
  /** `tcp`, `udp` or `icmp`. */
  protocol: string;
  source: string;
  /** Connections folded into this row, besides itself. */
  repeated: number;
}

/** One apply of the runtime's rule. */
export interface FirewallApplied {
  time_unix_nano: number;
  /** `start`, `configure`, `refresh` or `apply`. */
  reason: string;
  revision: string;
  /** The egress entries applied: hosts, CIDRs, `*` for any public address. */
  egress: string[];
  ingress: string[];
  /** The base layer's allowances, as the firewall wrote them. */
  base?: unknown;
  /** How many rules were compiled. */
  rules: number | null;
  /** Hosts that resolved to nothing. */
  unresolved: string[];
}

/** A runtime's firewall over a window. */
export interface RuntimeFirewall {
  success: boolean;
  runtime_uid: string;
  window: { since_unix_nano: number; days: number };
  /** Why the firewall did not take the runtime's rule, as its record says; empty when it holds. */
  refused: string;
  /** Latest first. None when the runtime has no firewall, or it has not reported yet. */
  applied: FirewallApplied[];
  /** The latest connections, latest first. */
  connections: FirewallConnection[];
  /** Over the whole window, each row counting itself and the connections folded into it. */
  counts: { allowed: number; refused: number; rows: number };
  /** The window held more connection rows than were counted. */
  truncated: boolean;
}

export interface RuntimeFirewallOptions {
  /** How many days back, 1 to 30; 7 by default. */
  days?: number;
  /** How many connections to return, latest first; 200 by default. */
  limit?: number;
}

/**
 * A runtime's firewall: the rule applied, its latest connections and their counts.
 *
 * Answers 404 when the runtime is not the caller's (or no longer runs).
 *
 * @param token - Authentication token.
 * @param runtimeUid - The runtime's uid.
 * @param options - The window and how many connections.
 * @param baseUrl - The OTEL service.
 */
export const getRuntimeFirewall = async (
  token: string,
  runtimeUid: string,
  options: RuntimeFirewallOptions = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<RuntimeFirewall> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (options.days) params.set('days', String(options.days));
  if (options.limit) params.set('limit', String(options.limit));
  const queryString = params.toString();
  const url = `${baseUrl}${API_BASE_PATHS.OTEL}/firewall/runtimes/${encodeURIComponent(runtimeUid)}${queryString ? `?${queryString}` : ''}`;

  return requestDatalayerAPI<RuntimeFirewall>({
    url,
    method: 'GET',
    token,
  });
};
