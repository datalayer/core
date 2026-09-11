/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The canonical orchestration model: what one agent says to another about
 * work it is delegating, supervising, steering, recovering or stopping.
 *
 * Every type here is generated from the pydantic models in
 * `datalayer_core/orchestration`, which are the source of truth
 * (PLAN_ORCHESTRATOR.md, 19.8), and from the control plane's OpenAPI
 * document for the answers it wraps them in and the operations it serves.
 * Regenerate with `npm run generate:orchestration`;
 * `npm run check:orchestration-generated` is the gate that fails when the
 * checked-in file is not what the models and the document say. Do not edit
 * `generated.ts` by hand.
 *
 * The wire is camel case, so nothing here converts anything: unlike the MCP
 * and Contents clients, which speak a snake case wire and camel case in the
 * browser, an orchestration document is the same in both places.
 *
 * `client` is the control plane's twelve commands and two reads, every path
 * taken from the generated operations; `events` is the subscription that
 * resumes after a dropped connection, and the user channel's tree
 * announcement; `measures` is how delegated work is doing, read from the
 * OTEL service's orchestration dashboard.
 *
 * @module api/orchestration
 */

export * from './generated';
export * from './lifecycle';
export * from './client';
export * from './events';
export * from './measures';
