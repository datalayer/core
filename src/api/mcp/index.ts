/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The Jupyter MCP Server's REST API: tasks, bindings, audit, activity,
 * policy and operations. The MCP endpoint itself is not here — an agent
 * speaks JSON-RPC to it; a browser reads what the agents did.
 *
 * @module api/mcp
 */

export * from './generated';
export * from './gateway';
export * from './tasks';
export * from './bindings';
export * from './audit';
export * from './activity';
export * from './organizations';
export * from './policy';
export * from './operations';
export * from './observability';
