/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What every gateway client shares: where the REST routes are, and how a
 * wire document becomes a model.
 *
 * The configured URL is the MCP resource — `https://mcp.datalayer.run/mcp`,
 * the address an agent connects to and the audience a token names. The
 * REST routes live on the same host under `/api/mcp/v1`, so the resource
 * path is taken off before a route is appended.
 *
 * Wire documents are snake case and the models camel case, as with
 * Contents, with one difference: a task's `result` and an audit row's
 * `redactedArguments` are a tool's own — their keys are the tool's
 * argument and output names and must survive as typed — so the envelope is
 * converted around them, never through them.
 *
 * @module api/mcp/gateway
 */

import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';

/** The host and scheme of the gateway, without the `/mcp` resource path. */
export const mcpGatewayOrigin = (
  mcpServerUrl: string = DEFAULT_SERVICE_URLS.JUPYTER_MCP_SERVER,
): string => {
  const trimmed = mcpServerUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/mcp') ? trimmed.slice(0, -'/mcp'.length) : trimmed;
};

export type McpQuery = Record<string, string | number | boolean | undefined | null>;

/** A REST route of the gateway, with its query string. */
export const mcpUrl = (
  mcpServerUrl: string,
  suffix: string,
  query: McpQuery = {},
): string => {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value));
    }
  }
  const search = parameters.toString();
  return `${mcpGatewayOrigin(mcpServerUrl)}${API_BASE_PATHS.MCP}${suffix}${
    search ? `?${search}` : ''
  }`;
};

/** A route outside the versioned API: `/api/mcp/version`, `/api/mcp/healthz`. */
export const mcpServiceUrl = (mcpServerUrl: string, suffix: string): string =>
  `${mcpGatewayOrigin(mcpServerUrl)}/api/mcp${suffix}`;

/** The fields whose keys belong to a tool, not to the contract. */
const PRESERVED_FIELDS = new Set(['result', 'redacted_arguments', 'client_info', 'input', 'output']);

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const camelKey = (key: string): string =>
  key.replace(/_([a-zA-Z0-9])/g, (_, character: string) => character.toUpperCase());

/**
 * A wire document as a model: snake case to camel case through the envelope,
 * the preserved fields carried as they came.
 */
export const fromWire = <T>(value: unknown): T => {
  if (Array.isArray(value)) {
    return value.map(item => fromWire(item)) as T;
  }
  if (!isObject(value)) {
    return value as T;
  }
  const converted: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    converted[camelKey(key)] = PRESERVED_FIELDS.has(key) ? item : fromWire(item);
  }
  return converted as T;
};

/** A request body as the gateway reads it. */
export const toWire = (value: unknown): unknown =>
  contentsToSnakeCase(value as JsonValue);

/** For the few answers with no tool-owned field, the Contents converter as is. */
export const fromWireStrict = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;
