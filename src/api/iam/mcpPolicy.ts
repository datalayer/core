/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The MCP policy layer IAM holds for one organization, team or person.
 *
 * Distinct from the *effective* policy the gateway answers, which is every
 * layer intersected with, per rule, the layer that decided it. That one is
 * the read: "what may my agent do, and who said so". This one is the write:
 * "what does my organization narrow".
 *
 * Only four kinds of rule can be stored, and IAM refuses anything else —
 * so a policy page cannot promise something the gateway never enforces, and
 * `toolDenyList` comes back as a typo rather than being kept as a setting
 * that does nothing.
 *
 * **Writes carry the version that was read.** A policy is small and read
 * whole, so a write replaces rather than merges; without the version, two
 * owners editing the same policy would each silently overwrite the other,
 * and the loser would not know. IAM answers `409` instead, and the caller
 * re-reads.
 *
 * @module api/iam/mcpPolicy
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** Which layer a policy belongs to. */
export type McpPolicyScope = 'organization' | 'team' | 'user';

/**
 * The rules a layer may set. Every one is optional: a layer that sets
 * nothing narrows nothing.
 */
export interface McpPolicyRules {
  /** Tools this layer forbids. Unions across layers — a layer may add a
   *  denial, never lift one. */
  toolDenylist?: string[];
  /**
   * Tools this layer permits, to the exclusion of the rest.
   *
   * An empty array **as written** is not an allowlist. A setting somebody
   * created and has not filled in would otherwise refuse every tool in the
   * organization, and the first conclusion drawn would be that the gateway
   * is down.
   */
  toolAllowlist?: string[];
  /** CIMD URLs or hostnames this layer admits. Empty is not an allowlist,
   *  for the same reason. */
  allowedClients?: string[];
  /** Calls a minute. **At least 1**: see `maxCallsPerMinute` below. */
  maxCallsPerMinute?: number;
  /** Credits a day, across the layer's agents. */
  maxCreditsPerDay?: number;
  /** Sandboxes at once. Counted per scope — a team's counts the team's. */
  maxConcurrentSandboxes?: number;
}

/** A stored layer, with the version a write must carry back. */
export interface McpPolicy extends McpPolicyRules {
  /**
   * What was read. Passed to the next write so a change made in between is
   * a `409` rather than a silent overwrite.
   *
   * Absent when nobody has written this layer yet.
   */
  version?: number;
}

/**
 * Every rule name IAM will store, in the order a form should show them.
 *
 * Exported so a form cannot drift from what the gateway enforces: a rule
 * rendered here and unknown to IAM is refused at the write, which reads to
 * the person filling it in as the page being broken.
 */
export const MCP_POLICY_RULES = [
  'toolDenylist',
  'toolAllowlist',
  'allowedClients',
  'maxCallsPerMinute',
  'maxCreditsPerDay',
  'maxConcurrentSandboxes',
] as const;

/** Raised when the policy changed between the read and the write. */
export class McpPolicyConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpPolicyConflict';
  }
}

const policyUrl = (
  baseUrl: string,
  scope: McpPolicyScope,
  subjectUid: string,
  query = '',
): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/mcp-policies/${encodeURIComponent(scope)}` +
  `/${encodeURIComponent(subjectUid)}${query}`;

/**
 * One layer's rules, or `null` where nobody has written it.
 *
 * `null` rather than an empty object, and the difference is the whole point:
 * "this organization narrows nothing" and "this organization has no policy"
 * are the same in effect and different to edit. A form that cannot tell them
 * apart offers **Remove** for a policy that does not exist.
 */
export const getMcpPolicy = async (
  token: string,
  scope: McpPolicyScope,
  subjectUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpPolicy | null> => {
  try {
    return await requestDatalayerAPI<McpPolicy>({
      url: policyUrl(baseUrl, scope, subjectUid),
      method: 'GET',
      token,
    });
  } catch (error) {
    // A layer nobody has written is a `404`, and it is an ordinary answer
    // rather than a failure — most organizations have never written one.
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
};

/**
 * Replace one layer's rules.
 *
 * Replace, not merge: a policy is read whole and small, and merging would
 * leave no way to express *removing* a rule — an owner clearing a denylist
 * would find it still there.
 */
export const setMcpPolicy = async (
  token: string,
  scope: McpPolicyScope,
  subjectUid: string,
  rules: McpPolicyRules,
  options: { expectedVersion?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpPolicy> => {
  const query =
    options.expectedVersion === undefined
      ? ''
      : `?expected_version=${encodeURIComponent(String(options.expectedVersion))}`;
  try {
    const response = await requestDatalayerAPI<{
      success: boolean;
      message?: string;
      policy?: McpPolicy;
    }>({
      url: policyUrl(baseUrl, scope, subjectUid, query),
      method: 'PUT',
      token,
      body: rules as Record<string, unknown>,
    });
    return response.policy ?? {};
  } catch (error) {
    if (isConflict(error)) {
      throw new McpPolicyConflict(
        'This policy changed while you were editing it. Read it again and ' +
          'reapply your change — otherwise one of the two edits is lost, and ' +
          'whoever loses it is not told.',
      );
    }
    throw error;
  }
};

/** Remove one layer, so it narrows nothing again. */
export const deleteMcpPolicy = async (
  token: string,
  scope: McpPolicyScope,
  subjectUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<void> => {
  await requestDatalayerAPI({
    url: policyUrl(baseUrl, scope, subjectUid),
    method: 'DELETE',
    token,
  });
};

const statusOf = (error: unknown): number | undefined => {
  const candidate = error as { status?: number; response?: { status?: number } };
  return candidate?.status ?? candidate?.response?.status;
};

const isNotFound = (error: unknown): boolean => statusOf(error) === 404;

const isConflict = (error: unknown): boolean => statusOf(error) === 409;
