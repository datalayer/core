/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

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
  {
    method: 'GET',
    path: '/.well-known/mcp-server',
    operationId: 'server_card_endpoint__well_known_mcp_server_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/.well-known/oauth-protected-resource',
    operationId:
      'protected_resource_metadata_endpoint__well_known_oauth_protected_resource_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/.well-known/oauth-protected-resource/mcp',
    operationId:
      'protected_resource_metadata_endpoint__well_known_oauth_protected_resource_mcp_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/api/mcp/healthz',
    operationId: 'healthz_endpoint_api_mcp_healthz_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/api/mcp/readyz',
    operationId: 'readyz_endpoint_api_mcp_readyz_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/activity',
    operationId: 'activity_endpoint_api_mcp_v1_activity_get',
    parameters: [{ name: 'org', in: 'query' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/alerts',
    operationId: 'alerts_endpoint_api_mcp_v1_alerts_get',
    parameters: [
      { name: 'org', in: 'query' },
      { name: 'scope', in: 'query' },
      { name: 'unacknowledged', in: 'query' },
    ],
  },
  {
    method: 'POST',
    path: '/api/mcp/v1/alerts/test',
    operationId: 'test_alert_rule_endpoint_api_mcp_v1_alerts_test_post',
    parameters: [],
  },
  {
    method: 'POST',
    path: '/api/mcp/v1/alerts/{alert_uid}/acknowledge',
    operationId:
      'acknowledge_alert_endpoint_api_mcp_v1_alerts__alert_uid__acknowledge_post',
    parameters: [{ name: 'alert_uid', in: 'path' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/audit',
    operationId: 'audit_endpoint_api_mcp_v1_audit_get',
    parameters: [
      { name: 'org', in: 'query' },
      { name: 'team', in: 'query' },
      { name: 'user', in: 'query' },
      { name: 'client', in: 'query' },
      { name: 'agent', in: 'query' },
      { name: 'tool', in: 'query' },
      { name: 'method', in: 'query' },
      { name: 'decision', in: 'query' },
      { name: 'outcome', in: 'query' },
      { name: 'notebook', in: 'query' },
      { name: 'source', in: 'query' },
      { name: 'task', in: 'query' },
      { name: 'since', in: 'query' },
      { name: 'until', in: 'query' },
      { name: 'cursor', in: 'query' },
      { name: 'limit', in: 'query' },
      { name: 'export', in: 'query' },
    ],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/audit/forwarding',
    operationId: 'audit_forwarding_endpoint_api_mcp_v1_audit_forwarding_get',
    parameters: [{ name: 'org', in: 'query' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/bindings',
    operationId: 'list_bindings_endpoint_api_mcp_v1_bindings_get',
    parameters: [{ name: 'kind', in: 'query' }],
  },
  {
    method: 'DELETE',
    path: '/api/mcp/v1/bindings/{binding_uid}',
    operationId:
      'delete_binding_endpoint_api_mcp_v1_bindings__binding_uid__delete',
    parameters: [{ name: 'binding_uid', in: 'path' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/notebooks/{notebook_uid}/tasks',
    operationId:
      'list_notebook_tasks_endpoint_api_mcp_v1_notebooks__notebook_uid__tasks_get',
    parameters: [
      { name: 'notebook_uid', in: 'path' },
      { name: 'cursor', in: 'query' },
      { name: 'limit', in: 'query' },
    ],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/operations/jobs',
    operationId: 'operations_jobs_endpoint_api_mcp_v1_operations_jobs_get',
    parameters: [],
  },
  {
    method: 'POST',
    path: '/api/mcp/v1/operations/runtime-ended',
    operationId:
      'runtime_ended_endpoint_api_mcp_v1_operations_runtime_ended_post',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/operations/workers',
    operationId:
      'operations_workers_endpoint_api_mcp_v1_operations_workers_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/operations/workflows',
    operationId:
      'workflows_operations_endpoint_api_mcp_v1_operations_workflows_get',
    parameters: [],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/organizations/{org_uid}/overview',
    operationId:
      'organization_overview_endpoint_api_mcp_v1_organizations__org_uid__overview_get',
    parameters: [
      { name: 'org_uid', in: 'path' },
      { name: 'team', in: 'query' },
    ],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/organizations/{org_uid}/usage',
    operationId:
      'organization_usage_endpoint_api_mcp_v1_organizations__org_uid__usage_get',
    parameters: [
      { name: 'org_uid', in: 'path' },
      { name: 'team', in: 'query' },
    ],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/policy',
    operationId: 'policy_endpoint_api_mcp_v1_policy_get',
    parameters: [
      { name: 'agent', in: 'query' },
      { name: 'org', in: 'query' },
      { name: 'team', in: 'query' },
    ],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/tasks',
    operationId: 'list_tasks_endpoint_api_mcp_v1_tasks_get',
    parameters: [
      { name: 'notebook', in: 'query' },
      { name: 'sandbox', in: 'query' },
      { name: 'agent', in: 'query' },
      { name: 'status', in: 'query' },
      { name: 'org', in: 'query' },
      { name: 'cursor', in: 'query' },
      { name: 'limit', in: 'query' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/mcp/v1/tasks/{task_uid}',
    operationId: 'cancel_task_endpoint_api_mcp_v1_tasks__task_uid__delete',
    parameters: [{ name: 'task_uid', in: 'path' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/tasks/{task_uid}',
    operationId: 'get_task_endpoint_api_mcp_v1_tasks__task_uid__get',
    parameters: [{ name: 'task_uid', in: 'path' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/v1/tasks/{task_uid}/events',
    operationId: 'task_events_endpoint_api_mcp_v1_tasks__task_uid__events_get',
    parameters: [{ name: 'task_uid', in: 'path' }],
  },
  {
    method: 'POST',
    path: '/api/mcp/v1/tasks/{task_uid}/input',
    operationId: 'answer_task_endpoint_api_mcp_v1_tasks__task_uid__input_post',
    parameters: [{ name: 'task_uid', in: 'path' }],
  },
  {
    method: 'GET',
    path: '/api/mcp/version',
    operationId: 'version_endpoint_api_mcp_version_get',
    parameters: [],
  },
];
