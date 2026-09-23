/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where each Datalayer service lives when nothing says otherwise.
 *
 * Two planes. The control plane (`prod1`) holds identity, the library, the
 * spaces and the platform's own services. The runtimes plane (`r1`) holds
 * what runs close to compute: the runtimes, the scheduler, the agents, the
 * contents that back the Home Folder — and inference, which moved there
 * with the agents that call it.
 *
 * One table, imported by everything that needs a default host: the core
 * store's initial configuration, the configuration helpers, and any host
 * that wants to know where to point. It used to be a literal in each of
 * those, and the examples' Makefile besides, so a service that changed plane
 * was corrected in some places and not others — inference was still pinned
 * to the control plane by the examples after it moved, and every in-page
 * agent there failed to reach it.
 *
 * No imports, so anything may import it without a cycle.
 *
 * @module config/planes
 */

/** The control plane. */
export const CONTROL_PLANE_URL = 'https://prod1.datalayer.run';

/** The runtimes plane. */
export const RUNTIMES_PLANE_URL = 'https://r1.datalayer.run';

/** The MCP gateway, on its own host. */
export const MCP_SERVER_URL = 'https://mcp.datalayer.run/mcp';

/** Every service's default host, by the configuration key that names it. */
export const DEFAULT_PLANE_URLS = {
  iamUrl: CONTROL_PLANE_URL,
  managerUrl: CONTROL_PLANE_URL,
  libraryUrl: CONTROL_PLANE_URL,
  spacerUrl: CONTROL_PLANE_URL,
  otelUrl: CONTROL_PLANE_URL,
  growthUrl: CONTROL_PLANE_URL,
  inboundsUrl: CONTROL_PLANE_URL,
  successUrl: CONTROL_PLANE_URL,
  supportUrl: CONTROL_PLANE_URL,
  contentsUrl: RUNTIMES_PLANE_URL,
  runtimesUrl: RUNTIMES_PLANE_URL,
  schedulerUrl: RUNTIMES_PLANE_URL,
  aiAgentsUrl: RUNTIMES_PLANE_URL,
  aiInferenceUrl: RUNTIMES_PLANE_URL,
  datalayerMcpServerUrl: MCP_SERVER_URL,
} as const;
