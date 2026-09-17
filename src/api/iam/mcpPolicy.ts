/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

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

/**
 * Which layer a policy belongs to.
 *
 * The names IAM stores, exactly: `personal`, not `user`. It refuses an
 * unknown scope with a `422`, so getting this wrong is not a subtle
 * mis-scoping — it is every read and every write of that layer failing.
 * Held against IAM's own `POLICY_SCOPES` by a test in the gateway's suite.
 */
export const MCP_POLICY_SCOPES = ['organization', 'team', 'personal'] as const;

export type McpPolicyScope = (typeof MCP_POLICY_SCOPES)[number];

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
  /**
   * GPU-hours over the last 30 days. Refuses a launch on a **GPU**
   * environment; a CPU sandbox is unaffected.
   *
   * Not expressible as credits: the credits a GPU hour costs differ per
   * environment, so neither number can be derived from the other.
   *
   * A trailing 30 days, not a calendar month — a limit that resets on the
   * 1st can be spent twice inside 48 hours, once each side of the reset.
   * And it counts **every** GPU-hour billed to the scope, agents' or not:
   * the agent dimension lives on a child document in the ledger and cannot
   * be a clause of the sum. A form must say both.
   */
  gpuHoursPerMonth?: number;
  /**
   * How long a connection may go on being refreshed before the person signs
   * in and consents again. Hours, because that is the unit it is set in.
   *
   * Enforced by **IAM**, at its token endpoint, rather than by the gateway:
   * a session's age is a fact about the grant, and the grant is IAM's. The
   * gateway never sees it.
   */
  sessionMaxHours?: number;
  /**
   * Whether this organization's own identity provider may stand in for the
   * consent screen, for a client it already admits.
   *
   * Narrow by construction, and off unless turned on: it applies only to a
   * session that came through one of this organization's own enabled
   * providers, only for a client named on `allowedClients`, and only when
   * that list is not empty. Every other session still sees the screen.
   *
   * Not "require SSO": it does not stop anybody signing in another way.
   */
  ssoAdmitsWithoutConsent?: boolean;
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
  'gpuHoursPerMonth',
  'sessionMaxHours',
  'ssoAdmitsWithoutConsent',
] as const;

/** Raised when the policy changed between the read and the write. */
export class McpPolicyConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpPolicyConflict';
  }
}

/** `suffix` is appended verbatim: a query string, or a further path segment. */
const policyUrl = (
  baseUrl: string,
  scope: McpPolicyScope,
  subjectUid: string,
  suffix = '',
): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/mcp-policies/${encodeURIComponent(scope)}` +
  `/${encodeURIComponent(subjectUid)}${suffix}`;

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
  const candidate = error as {
    status?: number;
    response?: { status?: number };
  };
  return candidate?.status ?? candidate?.response?.status;
};

const isNotFound = (error: unknown): boolean => statusOf(error) === 404;

const isConflict = (error: unknown): boolean => statusOf(error) === 409;

/**
 * One `allowedClients` entry, as the server can describe it.
 *
 * Three states, kept apart deliberately — collapsing any two of them is the
 * mistake this shape exists to prevent.
 */
export interface AdmittedClient {
  /** Exactly as it is stored, so somebody can find the line they typed. */
  entry: string;
  /**
   * `hostname` admits every client that host publishes and has no document
   * to read. `url` names one client document. `unusable` matches nothing —
   * almost always a URL pasted without its scheme.
   */
  kind: 'hostname' | 'url' | 'unusable';
  hostname?: string;
  /**
   * Only for `url`. `false` means the document could not be read, which is
   * an entry that silently admits nobody — and reads to the vendor whose
   * agent is refused as a deliberate decision.
   */
  resolved?: boolean;
  clientName?: string;
  clientHostname?: string;
  clientUri?: string;
  /** Every redirect goes to the reader's own machine. */
  localhostOnly?: boolean;
  /** Why it cannot be read, or what a hostname entry admits. */
  detail?: string;
}

export interface AdmittedClients {
  /**
   * Whether this layer names an allowlist **at all**.
   *
   * `false` for an absent or empty list, and it is not a detail: an empty
   * list is not an allowlist, and the gateway admits every client through a
   * layer that has not filled one in. A page rendering "0 clients admitted"
   * over `false` would state the opposite of what is enforced.
   */
  allowlisted: boolean;
  clients: AdmittedClient[];
  detail?: string;
}

interface WireAdmittedClient {
  entry?: string;
  kind?: string;
  hostname?: string;
  resolved?: boolean;
  client_name?: string;
  client_hostname?: string;
  client_uri?: string;
  localhost_only?: boolean;
  detail?: string;
}

const admittedFromWire = (wire: WireAdmittedClient): AdmittedClient => ({
  entry: wire.entry ?? '',
  kind:
    wire.kind === 'hostname' || wire.kind === 'url' ? wire.kind : 'unusable',
  hostname: wire.hostname || undefined,
  resolved: wire.resolved,
  clientName: wire.client_name || undefined,
  clientHostname: wire.client_hostname || undefined,
  clientUri: wire.client_uri || undefined,
  localhostOnly: wire.localhost_only,
  detail: wire.detail || undefined,
});

/**
 * What this layer's admitted-client entries actually name.
 *
 * Its own call rather than part of `getMcpPolicy`, because that one is what
 * the gateway reads on every uncached tool call and this may fetch a client
 * document per entry — which is exactly what must never happen on the
 * enforcement path.
 */
export const getAdmittedClients = async (
  token: string,
  scope: McpPolicyScope,
  subjectUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<AdmittedClients> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    allowlisted?: boolean;
    clients?: WireAdmittedClient[];
    detail?: string;
  }>({
    url: policyUrl(baseUrl, scope, subjectUid, '/admitted-clients'),
    method: 'GET',
    token,
  });
  return {
    allowlisted: response.allowlisted === true,
    clients: (response.clients ?? []).map(admittedFromWire),
    detail: response.detail || undefined,
  };
};
