/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the Jupyter MCP Server lets a person's agents do — and who decided.
 *
 * Policy is layered and each layer only narrows: the platform's defaults,
 * then the organization's rules for an organization-scope token, then the
 * person's own. The gateway answers the **effective** policy for a token
 * with, per rule, the layer that decided it, which is what turns "why was
 * my agent refused" from a support question into a line on this page.
 *
 * Read-only, always: this table is the answer, not the form. The personal
 * rules a person may narrow for themselves, and the forms for the
 * organizations they own, are the two sections beneath it and arrive with
 * the policy layers in milestone 3 — until then the gateway answers the
 * platform defaults and the token's scopes, and every row says so.
 *
 * @module views/mcp/Policies
 */

import { useMemo, useState } from 'react';
import { Heading, Label, Link, Select, Spinner, Text } from '@primer/react';
import { Blankslate, Table } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { ShieldCheckIcon } from '@primer/octicons-react';
import { McpErrorBlankslate } from '../../components/mcp';
import { useConnectedAgents, useEffectivePolicy } from '../../hooks/useMcp';
import { useNavigate } from '../../hooks';
import type { McpEffectivePolicy, McpPolicyLayer, McpPolicyRule, McpToolRule } from '../../models/McpPolicy';
import { type McpErrorStateFn, type McpRoutes } from './types';

export interface PoliciesProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /** The organization whose name a row can carry, when the token has one. */
  organizationName?: string;
  showTitle?: boolean;
}

/**
 * The agent a preview is taken as, or nothing for the reader's own token.
 *
 * Empty is the reader's own, which is the default and the honest one: the
 * table answers "what applies to me" until somebody asks otherwise.
 */
export type PolicyPreviewAgent = string;

/**
 * The filter for a preview choice.
 *
 * A blank choice is *nobody*, not an agent whose client id is the empty
 * string: sent as a filter that matches nothing, and a table that renders
 * empty looks like a policy that grants nothing rather than a query that
 * asked for no one.
 */
export const policyFiltersOf = (previewAs: PolicyPreviewAgent) => ({
  agent: previewAs.trim() || undefined,
});

/** How each layer is named on a row, in the reader's terms. */
export const layerLabel = (layer: McpPolicyLayer, organizationName?: string): string => {
  switch (layer) {
    case 'platform':
      return 'Datalayer default';
    case 'organization':
      return organizationName
        ? `required by ${organizationName} (organization)`
        : 'required by your organization';
    case 'team':
      return 'required by your team';
    default:
      return 'you asked';
  }
};

const LAYER_VARIANT: Record<McpPolicyLayer, 'secondary' | 'accent' | 'attention'> = {
  platform: 'secondary',
  organization: 'accent',
  team: 'accent',
  personal: 'attention',
};

/**
 * The rules this page names, in the order it names them, with the words a
 * reader uses rather than the field names of the policy document.
 */
const ROW_ORDER: { name: string; label: string; description: string }[] = [
  {
    name: 'approval_policy',
    label: 'Default approval',
    description: 'What happens before a tool your agent calls actually runs.',
  },
  {
    name: 'allowed_clients',
    label: 'Clients admitted',
    description: 'Which MCP clients may hold a grant at all.',
  },
  {
    name: 'require_org_sso',
    label: 'Sign-in required',
    description: 'Whether an agent must be authorized through your organization.',
  },
  {
    name: 'require_dpop',
    label: 'Token binding',
    description: 'Whether a token must be bound to the key of the client holding it.',
  },
  {
    name: 'max_scopes',
    label: 'Scopes at most',
    description: 'The ceiling on what any agent of yours may be granted.',
  },
  {
    name: 'allowed_environments',
    label: 'Compute: environments',
    description: 'The environments an agent may launch a sandbox in.',
  },
  {
    name: 'allowed_providers',
    label: 'Compute: providers',
    description: 'Where those sandboxes may run.',
  },
  { name: 'max_gpu', label: 'Compute: GPU at most', description: '' },
  { name: 'max_reservation_minutes', label: 'Compute: reservation at most', description: '' },
  { name: 'credits_per_day', label: 'Spend: credits a day', description: '' },
  { name: 'calls_per_minute', label: 'Rate: calls a minute', description: '' },
  { name: 'session_max_hours', label: 'Session at most', description: '' },
];

/** A rule's value in the words of the page, whatever shape it arrived in. */
export const ruleValueLabel = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'No limit';
  }
  if (typeof value === 'boolean') {
    return value ? 'Required' : 'Not required';
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? 'Nothing admitted' : value.join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join(' · ');
  }
  return String(value);
};

/** The tools of one access kind, and what happens before they run. */
const ToolGroup = ({
  title,
  description,
  tools,
  organizationName,
}: {
  title: string;
  description: string;
  tools: McpToolRule[];
  organizationName?: string;
}): JSX.Element => (
  <Box sx={{ display: 'grid', gap: 2 }}>
    <Box>
      <Text sx={{ fontSize: 1, fontWeight: 'semibold', display: 'block' }}>{title}</Text>
      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{description}</Text>
    </Box>
    {tools.length === 0 ? (
      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        No tool of this kind is available to your agents.
      </Text>
    ) : (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {tools.map(tool => (
          <Label
            key={tool.tool}
            size="small"
            variant={
              !tool.allowed ? 'danger' : tool.approval === 'explicit' ? 'attention' : 'secondary'
            }
            title={`${tool.scope} · ${tool.approval ?? 'no approval rule'} · ${layerLabel(
              tool.decidedBy,
              organizationName,
            )}`}
          >
            {tool.tool}
          </Label>
        ))}
      </Box>
    )}
  </Box>
);

export const Policies = ({
  errorState,
  routes,
  organizationName,
  showTitle = true,
}: PoliciesProps): JSX.Element => {
  const navigate = useNavigate();
  // Whose policy is being read. Empty is the reader's own.
  //
  // The layers differ per agent — a client admitted by one organization and
  // not another, a scope one grant carries and the next does not — so "what
  // applies" has no single answer once somebody has connected more than one
  // agent. Without this the page answered for the reader's own token and
  // said nothing about which, which is the answer to a question nobody
  // asked.
  const [previewAs, setPreviewAs] = useState<PolicyPreviewAgent>('');
  const agents = useConnectedAgents();
  const policy = useEffectivePolicy(policyFiltersOf(previewAs).agent);

  const rows = useMemo(() => {
    const effective: McpEffectivePolicy | undefined = policy.data;
    if (!effective) {
      return [];
    }
    const byName = new Map(effective.rules.map(rule => [rule.name, rule]));
    const known = ROW_ORDER.filter(row => byName.has(row.name)).map(row => ({
      ...row,
      rule: byName.get(row.name) as McpPolicyRule,
    }));
    // A rule the gateway answers that this page has no wording for is still
    // shown: hiding it would make the page a partial answer to "what applies".
    const rest = effective.rules
      .filter(rule => !ROW_ORDER.some(row => row.name === rule.name))
      .map(rule => ({ name: rule.name, label: rule.name, description: '', rule }));
    return [...known, ...rest];
  }, [policy.data]);

  const tools = policy.data?.tools ?? [];
  const readOnlyTools = tools.filter(tool => tool.access === 'read');
  const writeTools = tools.filter(tool => tool.access === 'write');
  const executeTools = tools.filter(tool => tool.access === 'execute' || !tool.access);

  if (policy.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(policy.error, 'Policies')}
        onRetry={() => policy.refetch()}
      />
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 4, minWidth: 0 }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            Policies
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            {previewAs
              ? 'What applies to this agent, and which layer decided it.'
              : 'What applies to your agents, and which layer decided it.'}
          </Text>
        </Box>
      )}

      {/* Whose policy this is.
 
          Shown only when there is more than one answer: with a single
          connected agent the reader's own token and that agent see the same
          layers, and a picker offering one option is a control that asks a
          question it already knows the answer to. */}
      {(agents.data?.length ?? 0) > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Preview as</Text>
          <Box sx={{ minWidth: '18rem' }}>
            <Select
              value={previewAs}
              onChange={event => setPreviewAs(event.target.value)}
              aria-label="Preview the policy as"
            >
              <Select.Option value="">You — your own token</Select.Option>
              {(agents.data ?? []).map(agent => (
                <Select.Option key={agent.uid} value={agent.clientId}>
                  {agent.clientName || agent.clientId}
                </Select.Option>
              ))}
            </Select>
          </Box>
          {previewAs && (
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              A grant carries its own scopes and its own admitted clients, so
              this can differ from what applies to you.
            </Text>
          )}
        </Box>
      )}

      {policy.isPending && !policy.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <Spinner />
        </Box>
      ) : rows.length === 0 && tools.length === 0 ? (
        <Blankslate border spacious>
          <Blankslate.Visual>
            <ShieldCheckIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>The defaults apply</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>
              No agent is connected yet, so nothing narrows the Datalayer defaults.
              Connect a client and this page fills with what its calls are allowed
              to do.
            </Text>
          </Blankslate.Description>
          <Link
            as="button"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate(routes.access)}
          >
            Set up a client
          </Link>
        </Blankslate>
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Heading as="h3" sx={{ fontSize: 2 }}>
              What applies to your agents
            </Heading>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              Scope of this reading: {policy.data?.scope ?? 'personal'}
              {policy.data?.evaluatedAt ? ` · evaluated ${policy.data.evaluatedAt}` : ''}
            </Text>
          </Box>

          <Table.Container>
            <Table.Title as="h4" id="effective-policy">
              Effective policy
            </Table.Title>
            <Table.Subtitle as="p" id="effective-policy-subtitle">
              Each layer only narrows the one above it, so the strictest rule is what
              applies.
            </Table.Subtitle>
            <Box
              as="table"
              aria-labelledby="effective-policy"
              aria-describedby="effective-policy-subtitle"
              sx={{ width: '100%', borderCollapse: 'collapse' }}
            >
              <Box as="thead">
                <Box as="tr">
                  {['Rule', 'What applies', 'Decided by'].map(header => (
                    <Box
                      as="th"
                      key={header}
                      sx={{
                        textAlign: 'left',
                        fontSize: 0,
                        color: 'fg.muted',
                        fontWeight: 'semibold',
                        py: 2,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'border.default',
                      }}
                    >
                      {header}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box as="tbody">
                {rows.map(row => (
                  <Box as="tr" key={row.name}>
                    <Box
                      as="td"
                      sx={{
                        py: 2,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'border.muted',
                        verticalAlign: 'top',
                      }}
                    >
                      <Text sx={{ fontSize: 1, display: 'block' }}>{row.label}</Text>
                      {row.description && (
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{row.description}</Text>
                      )}
                    </Box>
                    <Box
                      as="td"
                      sx={{
                        py: 2,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'border.muted',
                        verticalAlign: 'top',
                      }}
                    >
                      <Text sx={{ fontSize: 1 }}>{ruleValueLabel(row.rule.value)}</Text>
                    </Box>
                    <Box
                      as="td"
                      sx={{
                        py: 2,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'border.muted',
                        verticalAlign: 'top',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Label size="small" variant={LAYER_VARIANT[row.rule.decidedBy]}>
                        {layerLabel(row.rule.decidedBy, organizationName)}
                      </Label>
                      {row.rule.reason && (
                        <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block', mt: 1 }}>
                          {row.rule.reason}
                        </Text>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Table.Container>

          <Box sx={{ display: 'grid', gap: 3 }}>
            <ToolGroup
              title="Read-only tools"
              description="Tools that only look: listing, reading a cell, reading a source."
              tools={readOnlyTools}
              organizationName={organizationName}
            />
            <ToolGroup
              title="Tools that change things"
              description="Tools that write to a notebook, a document or a source."
              tools={writeTools}
              organizationName={organizationName}
            />
            <ToolGroup
              title="Tools that launch or spend"
              description="Tools that execute code, launch a sandbox or reserve compute."
              tools={executeTools}
              organizationName={organizationName}
            />
          </Box>

          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            Your token carries {policy.data?.scopes.length ?? 0} scopes, which is the
            ceiling over every rule above:{' '}
            {(policy.data?.scopes ?? []).join(', ') || 'none'}.
          </Text>
        </>
      )}

      {/* What this page becomes, said plainly rather than left as a gap. */}
      <Box
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          bg: 'canvas.subtle',
          display: 'grid',
          gap: 1,
        }}
      >
        <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>Your own rules</Text>
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          Narrowing the defaults for your own agents — approval by tool, a daily
          credits cap, a denylist, the environments they may use — is edited here once
          the policy layers ship. When your agents act inside an organization, that
          organization's policy applies instead of yours.
        </Text>
        <Text sx={{ fontSize: 1, fontWeight: 'semibold', mt: 2 }}>
          Organizations you own
        </Text>
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          The policy form for each organization you own, with its history and a preview
          of what one agent would get, is the same form the organization's MCP tab
          carries. It joins this page with the layers.
        </Text>
      </Box>
    </Box>
  );
};

export default Policies;
