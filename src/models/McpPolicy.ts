/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The MCP policy: what an agent *may do*.
 *
 * Policy is layered and each layer only narrows: platform ∩ organization ∩
 * team for an organization-scope token, platform ∩ personal for a
 * personal-scope one. The organization's and the person's layers are IAM
 * settings; the gateway answers the **effective** policy for a token with,
 * per rule, which layer decided — what the Policies page renders as
 * "Datalayer default", "required by your organization" or "you asked".
 *
 * Until milestone 3 adds the layers, `GET /api/mcp/v1/policy` answers the
 * platform defaults from `tool_policy.py` and the token's scopes.
 *
 * @module models/McpPolicy
 */

export type McpPolicyLayer = 'platform' | 'organization' | 'team' | 'personal';

/** The Contents approval vocabulary. */
export type McpApprovalPolicy = 'explicit' | 'auto-allowlisted' | 'never';

export type McpPolicyScope = 'personal' | 'organization';

/** One rule of the effective policy, and the layer that decided it. */
export interface McpPolicyRule {
  /** The rule's name in the organization policy vocabulary, e.g. `tool_denylist`. */
  name: string;
  value: unknown;
  decidedBy: McpPolicyLayer;
  /** Why, when the gateway has a sentence for it. */
  reason?: string | null;
}

/** What one tool needs, and what happens before it runs. */
export interface McpToolRule {
  tool: string;
  scope: string;
  access?: 'read' | 'write' | 'execute';
  approval?: McpApprovalPolicy;
  allowed: boolean;
  decidedBy: McpPolicyLayer;
}

/** The effective policy for one token, redacted to what its holder may see. */
export interface McpEffectivePolicy {
  scope: McpPolicyScope;
  orgUid?: string | null;
  teamUid?: string | null;
  /** The agent the policy was evaluated for, when previewing as one. */
  clientId?: string | null;
  /** The scopes the token carries; the ceiling over every tool rule. */
  scopes: string[];
  rules: McpPolicyRule[];
  tools: McpToolRule[];
  evaluatedAt?: string;
}

/**
 * The organization (or team) MCP policy as IAM keeps it, versioned and
 * audited. Every field is optional: an absent rule narrows nothing.
 */
export interface McpOrganizationPolicy {
  version?: number;
  /** CIMD URLs, client ids or software ids; fails closed. */
  allowedClients?: string[];
  requireDpop?: boolean;
  requireOrgSso?: boolean;
  maxScopes?: string[];
  toolAllowlist?: string[];
  toolDenylist?: string[];
  /** Per tool, or per annotation (`destructiveHint`, `readOnlyHint`). */
  approvalPolicy?: Record<string, McpApprovalPolicy>;
  allowedEnvironments?: string[];
  allowedProviders?: string[];
  maxGpu?: number;
  maxReservationMinutes?: number;
  creditsPerDay?: number;
  callsPerMinute?: number;
  sessionMaxHours?: number;
  updatedAt?: string;
  updatedBy?: string;
}

/** A person's rules for the agents acting for them outside any organization. */
export type McpPersonalPolicy = Pick<
  McpOrganizationPolicy,
  | 'version'
  | 'approvalPolicy'
  | 'creditsPerDay'
  | 'toolDenylist'
  | 'allowedEnvironments'
  | 'sessionMaxHours'
  | 'updatedAt'
>;
