/* This file is generated from the Datalayer Jupyter MCP Server OpenAPI. Do not edit. */

export interface HTTPValidationError {
  detail?: Array<ValidationError>;
}

export interface ValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

/** One REST route the gateway declares. */
export interface McpGatewayRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  operationId: string;
  parameters: Array<{ name: string; in: string }>;
}

/** The gateway version the routes were read from: 0.0.1. */
export const MCP_GATEWAY_ROUTES: ReadonlyArray<McpGatewayRoute> = [
  { method: 'GET', path: "/.well-known/oauth-protected-resource", operationId: "protected_resource_metadata_endpoint__well_known_oauth_protected_resource_get", parameters: [] },
  { method: 'GET', path: "/.well-known/oauth-protected-resource/mcp", operationId: "protected_resource_metadata_endpoint__well_known_oauth_protected_resource_mcp_get", parameters: [] },
  { method: 'GET', path: "/api/mcp/healthz", operationId: "healthz_endpoint_api_mcp_healthz_get", parameters: [] },
  { method: 'GET', path: "/api/mcp/v1/executions/{execution_id}", operationId: "get_execution_endpoint_api_mcp_v1_executions__execution_id__get", parameters: [{ name: "execution_id", in: "path" }] },
  { method: 'POST', path: "/api/mcp/v1/executions/{execution_id}/cancel", operationId: "cancel_execution_endpoint_api_mcp_v1_executions__execution_id__cancel_post", parameters: [{ name: "execution_id", in: "path" }] },
  { method: 'GET', path: "/api/mcp/v1/notebooks/{notebook_id}/executions", operationId: "list_executions_endpoint_api_mcp_v1_notebooks__notebook_id__executions_get", parameters: [{ name: "notebook_id", in: "path" }] },
  { method: 'GET', path: "/api/mcp/version", operationId: "version_endpoint_api_mcp_version_get", parameters: [] },
];
