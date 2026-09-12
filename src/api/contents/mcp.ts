/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An MCP source through the service: discovered, tested, used.
 *
 * Nothing here talks to the MCP server. Contents does, with the credential
 * it holds, through a session it opens for the caller and narrows to the
 * source's allowlists. What a browser gets back is tool definitions, call
 * records and approvals — and for a call that moved bytes, the Transfer or
 * object that holds them rather than the bytes.
 *
 * The wire types are the generated ones; what is declared here is what the
 * contract does not name — the status unions as standalone types, and which
 * of them are terminal.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase, contentsToSnakeCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  McpApproval,
  McpApprovalDecision,
  McpApprovalList,
  McpCall,
  McpCallCreate,
  McpCallList,
  McpHealth,
  McpResourceView,
  McpSession,
  McpSessionCreate,
  McpSessionList,
  McpToolManifest,
  McpToolView,
} from './generated';

export type McpCallStatus = McpCall['status'];
export type McpApprovalStatus = McpApproval['status'];
export type McpSessionStatus = McpSession['status'];

/** A call the service has finished with, one way or another. */
export const MCP_TERMINAL_CALL_STATUSES: ReadonlySet<McpCallStatus> = new Set<McpCallStatus>([
  'denied',
  'succeeded',
  'failed',
  'refused',
]);

export const isMcpCallTerminal = (status: McpCallStatus): boolean =>
  MCP_TERMINAL_CALL_STATUSES.has(status);

const convertRequest = (value: unknown): unknown =>
  contentsToSnakeCase(value as JsonValue);

const convertResponse = <T>(value: unknown): T =>
  contentsToCamelCase(value as JsonValue) as T;

/**
 * A tool's input schema is JSON Schema: its property names are the tool's
 * argument names and must survive as typed, so the discovery answer is
 * converted around them rather than through them.
 */
const convertDiscovery = (value: unknown): McpToolManifest => {
  const raw = (value ?? {}) as {
    tools?: Array<Record<string, unknown>>;
    resources?: Array<Record<string, unknown>>;
    discovered_at?: string;
  };
  const tools: Array<McpToolView> = (raw.tools ?? []).map(tool => ({
    name: String(tool.name ?? ''),
    description: (tool.description as string | null | undefined) ?? null,
    inputSchema:
      (tool.input_schema as Record<string, unknown> | undefined) ??
      (tool.inputSchema as Record<string, unknown> | undefined) ??
      {},
  }));
  const resources: Array<McpResourceView> = (raw.resources ?? []).map(resource => ({
    uri: String(resource.uri ?? ''),
    name: (resource.name as string | null | undefined) ?? null,
    mediaType: (resource.media_type as string | null | undefined) ?? null,
  }));
  return { tools, resources, discoveredAt: raw.discovered_at ?? '' };
};

const contentsUrl = (baseUrl: string, suffix: string): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}${suffix}`;

const sourceMcpUrl = (baseUrl: string, sourceUid: string, suffix = ''): string =>
  contentsUrl(baseUrl, `/sources/${encodeURIComponent(sourceUid)}/mcp${suffix}`);

const sessionUrl = (baseUrl: string, sessionUid: string, suffix = ''): string =>
  contentsUrl(baseUrl, `/mcp-sessions/${encodeURIComponent(sessionUid)}${suffix}`);

/** The tools and resources the server behind a source offers. */
export const discoverMcpTools = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpToolManifest> =>
  convertDiscovery(
    await requestDatalayerAPI({
      url: sourceMcpUrl(baseUrl, sourceUid, '/tools'),
      method: 'GET',
      token,
    }),
  );

/** Does the server answer through this source, right now? */
export const testMcpSource = async (
  token: string,
  sourceUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpHealth> =>
  convertResponse<McpHealth>(
    await requestDatalayerAPI({
      url: sourceMcpUrl(baseUrl, sourceUid, '/health'),
      method: 'POST',
      token,
    }),
  );

/**
 * Open a scoped connection to an MCP source on the caller's behalf.
 *
 * The session's allowlists are the source's, narrowed by `tools` when given.
 */
export const createMcpSession = async (
  token: string,
  request: McpSessionCreate,
  idempotencyKey: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpSession> =>
  convertResponse<McpSession>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, '/mcp-sessions'),
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: convertRequest(request),
    }),
  );

export const getMcpSession = async (
  token: string,
  sessionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpSession> =>
  convertResponse<McpSession>(
    await requestDatalayerAPI({
      url: sessionUrl(baseUrl, sessionUid),
      method: 'GET',
      token,
    }),
  );

/** Every session the caller opened. The contract lists them whole; a reader narrows. */
export const listMcpSessions = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpSessionList> =>
  convertResponse<McpSessionList>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, '/mcp-sessions'),
      method: 'GET',
      token,
    }),
  );

export const revokeMcpSession = async (
  token: string,
  sessionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpSession> =>
  convertResponse<McpSession>(
    await requestDatalayerAPI({
      url: sessionUrl(baseUrl, sessionUid),
      method: 'DELETE',
      token,
    }),
  );

/**
 * Invoke one tool through a session.
 *
 * The answer is the call record, not necessarily the result: under an
 * `explicit` approval policy it comes back `pending-approval` with the
 * approval to decide, and a bulk acquisition ends in artifacts that name a
 * Transfer rather than carrying bytes. The arguments are the tool's own and
 * go over as typed; only the envelope is converted.
 */
export const callMcpTool = async (
  token: string,
  sessionUid: string,
  request: McpCallCreate,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpCall> =>
  convertResponse<McpCall>(
    await requestDatalayerAPI({
      url: sessionUrl(baseUrl, sessionUid, '/calls'),
      method: 'POST',
      token,
      body: {
        tool: request.tool,
        arguments: request.arguments ?? {},
        ...(request.destinationUri ? { destination_uri: request.destinationUri } : {}),
      },
    }),
  );

export const getMcpCall = async (
  token: string,
  sessionUid: string,
  callUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpCall> =>
  convertResponse<McpCall>(
    await requestDatalayerAPI({
      url: sessionUrl(baseUrl, sessionUid, `/calls/${encodeURIComponent(callUid)}`),
      method: 'GET',
      token,
    }),
  );

/**
 * The calls made through a session, newest first.
 *
 * This is where provenance lives: a call whose result carries artifacts is
 * an acquisition, and the artifact names the Transfer, object and version it
 * became.
 */
export const listMcpCalls = async (
  token: string,
  sessionUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpCallList> =>
  convertResponse<McpCallList>(
    await requestDatalayerAPI({
      url: sessionUrl(baseUrl, sessionUid, '/calls'),
      method: 'GET',
      token,
    }),
  );

/** The caller's approvals, in one status; the contract filters on nothing else. */
export const listMcpApprovals = async (
  token: string,
  options: { status?: McpApprovalStatus } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpApprovalList> => {
  const parameters = new URLSearchParams();
  if (options.status) {
    parameters.set('status', options.status);
  }
  const query = parameters.toString();
  return convertResponse<McpApprovalList>(
    await requestDatalayerAPI({
      url: `${contentsUrl(baseUrl, '/mcp-approvals')}${query ? `?${query}` : ''}`,
      method: 'GET',
      token,
    }),
  );
};

/** Approve or reject a pending call; the note travels with the decision. */
export const decideMcpApproval = async (
  token: string,
  approvalUid: string,
  decision: 'approve' | 'reject',
  note?: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<McpApproval> => {
  const body: McpApprovalDecision = note ? { note } : {};
  return convertResponse<McpApproval>(
    await requestDatalayerAPI({
      url: contentsUrl(baseUrl, `/mcp-approvals/${encodeURIComponent(approvalUid)}/${decision}`),
      method: 'POST',
      token,
      body,
    }),
  );
};
