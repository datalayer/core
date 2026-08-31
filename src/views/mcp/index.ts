/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The MCP surfaces, as views the application composes: the dashboard, the
 * setup page, the connected agents, the audit log, the observability panes,
 * the effective policy and the organization's console.
 *
 * Every one of them owns its data and its states and nothing about routing,
 * which is what lets the web application, JupyterLab, VS Code and Desktop
 * draw the same page.
 *
 * @module views/mcp
 */

export * from './types';
export * from './format';
export * from './McpDashboard';
export * from './McpHome';
export * from './ConnectedAgents';
export * from './AlertDestinations';
export * from './AlertRules';
export * from './OrganizationPolicy';
export * from './PersonalPolicy';
export * from './PolicyForm';
export * from './TeamPolicies';
export * from './ServiceAgents';
export * from './AuditLog';
export * from './McpObservability';
export * from './Policies';
export * from './EnterpriseConsole';
