/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * One console for an administrator of an organization, rather than four
 * unrelated settings tabs.
 *
 * Every page here is the person's own view of the same Core pieces with the
 * organization as the scope: the audit page *is* the audit view, the
 * observability page *is* the observability view. There is one component to
 * test per surface, and an administrator who has learned the personal page
 * has learned this one.
 *
 * Milestone 1 carried Overview, Agents, Audit and Observability, read-only
 * over what exists. **Service Agents** joins them in milestone 3, and is the
 * one page here that *writes*: an organization's own principals, created,
 * rotated and revoked from it. Teams, Policies, Quotas, Alerts, Approvals
 * and Runs join as the layers behind them ship; the sub-navigation says so
 * rather than hiding what is coming.
 *
 * Roles: an `organization_owner` sees everything; an
 * `organization_security_auditor` sees the Overview, the Service Agents,
 * the Audit and the Observability, which is the directory an auditor asks
 * for — the service agents because an audit row naming `agent_uid` needs
 * somewhere to say what that agent is, and the list carries no key; an
 * `organization_usage_reviewer` sees the Overview. Anyone else is told
 * plainly that this is not theirs to read.
 *
 * The auditor's view of Service Agents is read-only, and the page is told
 * so rather than working it out: IAM refuses their writes either way, and a
 * button that exists to be refused is worse than no button.
 *
 * @module views/mcp/EnterpriseConsole
 */

import type { JSX } from 'react';
import {
  Button,
  Heading,
  Label,
  SegmentedControl,
  Spinner,
  Text,
} from '@primer/react';
import { Blankslate, DataTable, Table } from '@primer/react/experimental';
import type { DataTableProps } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import {
  AlertIcon,
  CheckCircleIcon,
  LockIcon,
  PlugIcon,
} from '@primer/octicons-react';
import {
  ClientBadge,
  McpErrorBlankslate,
  ScopeList,
} from '../../components/mcp';
import {
  useDisconnectAgent,
  useMcpActivity,
  useOrgMcpOverview,
} from '../../hooks/useMcp';
import { useNavigate, useToast } from '../../hooks';
import type { McpActiveClient } from '../../api/mcp';
import type { McpAuditFilters } from '../../api/mcp';
import { AuditLog } from './AuditLog';
import {
  McpObservability,
  type McpObservabilityPane,
} from './McpObservability';
import { AlertRules } from './AlertRules';
import { TeamPolicies } from './TeamPolicies';
import { OrganizationUsage } from './OrganizationUsage';
import { OrganizationPolicy } from './OrganizationPolicy';
import { ServiceAgents } from './ServiceAgents';
import { clientStatusOf, plural, timeAgo } from './format';
import { type McpErrorStateFn, type McpRoutes } from './types';

/** The pages milestone 1 carries. */
export type EnterpriseConsolePage =
  | 'overview'
  | 'usage'
  | 'agents'
  | 'service-agents'
  | 'policy'
  | 'teams'
  | 'alerts'
  | 'audit'
  | 'observability';

export const ENTERPRISE_CONSOLE_PAGES: {
  id: EnterpriseConsolePage;
  label: string;
}[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'agents', label: 'Agents' },
  { id: 'service-agents', label: 'Service Agents' },
  { id: 'policy', label: 'Policy' },
  { id: 'teams', label: 'Teams' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'audit', label: 'Audit' },
  { id: 'observability', label: 'Observability' },
];

/** Which pages each organization role may read. */
export const pagesForRoles = (roles: string[]): EnterpriseConsolePage[] => {
  if (roles.includes('organization_owner')) {
    return [
      'overview',
      'usage',
      'agents',
      'service-agents',
      'policy',
      'teams',
      'alerts',
      'audit',
      'observability',
    ];
  }
  if (roles.includes('organization_security_auditor')) {
    // The service agents too, read-only: an auditor reading a row that names
    // `agent_uid` needs somewhere to find out what that agent is, and the
    // list carries no key.
    // The policy too, read-only: an auditor asked why a call was refused
    // needs to see the rule that refused it, and the page carries no secret.
    return [
      'overview',
      'service-agents',
      'policy',
      // The team layers too: an auditor asked why one team's agents are
      // treated differently needs the layer that treats them so.
      'teams',
      // The alerts too: what an organization watches for is part of the
      // security posture an auditor is there to read.
      'alerts',
      'audit',
      'observability',
    ];
  }
  if (roles.includes('organization_usage_reviewer')) {
    // The page the role is named for. It saw only the Overview, which counts
    // runs and refusals and says nothing about a limit — a usage reviewer
    // with no usage page had nothing to review.
    return ['overview', 'usage'];
  }
  return [];
};

export interface EnterpriseConsoleProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /** The organization this console is of. */
  organization: { uid: string; handle: string; name?: string };
  /** The roles the signed-in person holds in this organization. */
  roles: string[];
  /** The page open; the address owns it. */
  page: EnterpriseConsolePage;
  onPageChange: (page: EnterpriseConsolePage) => void;
  /** The audit page's filters, as the address holds them. */
  auditFilters: McpAuditFilters;
  onAuditFiltersChange: (filters: McpAuditFilters) => void;
  /** The observability page's selection, likewise. */
  observabilityPane: McpObservabilityPane;
  onObservabilityPaneChange: (pane: McpObservabilityPane) => void;
  observabilityTask?: string;
  observabilityTrace?: string;
  onObservabilitySelect: (selection: { task?: string; trace?: string }) => void;
}

const Metric = ({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: 'neutral' | 'danger';
}): JSX.Element => (
  <Box
    sx={{
      p: 3,
      border: '1px solid',
      borderColor: 'border.default',
      borderRadius: 2,
      minWidth: 0,
    }}
  >
    <Text
      sx={{
        display: 'block',
        fontSize: 4,
        fontWeight: 'bold',
        color: tone === 'danger' ? 'danger.fg' : 'fg.default',
      }}
    >
      {value}
    </Text>
    <Text sx={{ display: 'block', fontSize: 0, color: 'fg.muted' }}>
      {label}
    </Text>
    {note && (
      <Text sx={{ display: 'block', fontSize: 0, color: 'fg.subtle' }}>
        {note}
      </Text>
    )}
  </Box>
);

type OrgAgentRow = McpActiveClient & { id: string };

export const EnterpriseConsole = ({
  errorState,
  routes,
  organization,
  roles,
  page,
  onPageChange,
  auditFilters,
  onAuditFiltersChange,
  observabilityPane,
  onObservabilityPaneChange,
  observabilityTask,
  observabilityTrace,
  onObservabilitySelect,
}: EnterpriseConsoleProps): JSX.Element => {
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const allowed = pagesForRoles(roles);
  const current = allowed.includes(page) ? page : allowed[0];

  const overview = useOrgMcpOverview(
    organization.uid,
    {},
    {
      enabled:
        Boolean(current) && (current === 'overview' || current === 'agents'),
    },
  );
  const activity = useMcpActivity(
    { org: organization.uid },
    { enabled: current === 'agents' },
  );
  const disconnect = useDisconnectAgent();

  if (allowed.length === 0) {
    return (
      <Blankslate border spacious>
        <Blankslate.Visual>
          <LockIcon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>Unauthorized</Blankslate.Heading>
        <Blankslate.Description>
          <Text sx={{ textAlign: 'center' }}>
            The MCP console of an organization is read by its owners, its
            security auditors and its usage reviewers. Ask an owner of{' '}
            {organization.name || organization.handle} for the role you need.
          </Text>
        </Blankslate.Description>
      </Blankslate>
    );
  }

  const agentRows: OrgAgentRow[] = (activity.data?.clients ?? []).map(
    client => ({
      ...client,
      id: client.clientId,
    }),
  );

  const agentColumns: DataTableProps<OrgAgentRow>['columns'] = [
    {
      header: 'Client',
      field: 'clientId',
      rowHeader: true,
      renderCell: row => (
        <ClientBadge clientId={row.clientId} clientName={row.clientName} />
      ),
    },
    {
      header: 'Member',
      id: 'member',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {row.lastCall?.userUid || '—'}
        </Text>
      ),
    },
    {
      header: 'Allowed to',
      id: 'scopes',
      width: 'growCollapse',
      renderCell: row => <ScopeList scopes={row.scopes ?? []} />,
    },
    {
      header: 'Last used',
      id: 'last-used',
      width: '120px',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {timeAgo(row.lastCall?.at) || 'Never'}
        </Text>
      ),
    },
    {
      header: 'Status',
      id: 'status',
      width: '120px',
      renderCell: row => {
        const status = clientStatusOf(row.lastCall?.at);
        return (
          <Label
            size="small"
            variant={
              status === 'active'
                ? 'success'
                : status === 'idle'
                  ? 'attention'
                  : 'secondary'
            }
          >
            {status}
          </Label>
        );
      },
    },
    {
      header: '',
      id: 'actions',
      width: '200px',
      align: 'end',
      renderCell: row => (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            onClick={() =>
              navigate(
                `${routes.audit}?org=${encodeURIComponent(organization.uid)}&agent=${encodeURIComponent(row.clientId)}`,
              )
            }
          >
            Audit
          </Button>
          <Button
            size="small"
            variant="danger"
            disabled={!row.grantUid}
            onClick={() =>
              row.grantUid &&
              disconnect.mutate(row.grantUid, {
                onSuccess: () =>
                  enqueueToast(
                    `${row.clientName || row.clientId} is disconnected.`,
                    {
                      variant: 'success',
                    },
                  ),
                onError: () =>
                  enqueueToast(
                    'That grant belongs to another member and is revoked by them today. Revoking on their behalf arrives with the organization agent directory.',
                    { variant: 'error' },
                  ),
              })
            }
          >
            Revoke
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 4, minWidth: 0 }}>
      <Box>
        <Heading as="h3" sx={{ fontSize: 2, mb: 1 }}>
          MCP — {organization.name || organization.handle}
        </Heading>
        <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
          What the agents of this organization are doing, what they were allowed
          to do, and how it ran.
        </Text>
      </Box>

      <SegmentedControl aria-label="MCP console pages" size="small">
        {ENTERPRISE_CONSOLE_PAGES.filter(entry =>
          allowed.includes(entry.id),
        ).map(entry => (
          <SegmentedControl.Button
            key={entry.id}
            selected={current === entry.id}
            onClick={() => onPageChange(entry.id)}
          >
            {entry.label}
          </SegmentedControl.Button>
        ))}
      </SegmentedControl>

      {current === 'overview' &&
        (overview.isError ? (
          <McpErrorBlankslate
            state={errorState(overview.error, 'The overview')}
            onRetry={() => overview.refetch()}
          />
        ) : overview.isPending && !overview.data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <Spinner />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 4 }}>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: [
                  'repeat(2, 1fr)',
                  'repeat(3, 1fr)',
                  'repeat(5, 1fr)',
                ],
              }}
            >
              <Metric
                label="Agents active today"
                value={overview.data?.agents.activeToday ?? 0}
                note={`${overview.data?.agents.delegated ?? 0} delegated · ${
                  overview.data?.agents.service ?? 0
                } service`}
              />
              <Metric
                label="Runs today"
                value={overview.data?.runs.today ?? 0}
              />
              <Metric
                label="Success rate"
                value={
                  overview.data?.runs.successRate === null ||
                  overview.data?.runs.successRate === undefined
                    ? '—'
                    : `${(overview.data.runs.successRate * 100).toFixed(0)}%`
                }
                note={`${overview.data?.runs.failed ?? 0} failed`}
              />
              <Metric
                label="Credits today"
                value={overview.data?.spend?.creditsToday ?? '—'}
                note={
                  overview.data?.spend?.quotaMonth
                    ? `${overview.data.spend.creditsMonth} of ${overview.data.spend.quotaMonth} this month`
                    : 'Quotas arrive with the organization policy'
                }
              />
              <Metric
                label="Refusals today"
                value={(overview.data?.refusals ?? []).reduce(
                  (sum, row) => sum + row.count,
                  0,
                )}
                tone={
                  (overview.data?.refusals ?? []).length > 0
                    ? 'danger'
                    : 'neutral'
                }
              />
            </Box>

            {(overview.data?.refusals ?? []).length > 0 && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Heading as="h4" sx={{ fontSize: 1 }}>
                  Why calls were refused
                </Heading>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {(overview.data?.refusals ?? []).map(row => (
                    <Label key={row.reason} size="small" variant="danger">
                      {row.reason} · {row.count}
                    </Label>
                  ))}
                </Box>
              </Box>
            )}

            {/* The compliance strip: each line green, or naming what is missing. */}
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Heading as="h4" sx={{ fontSize: 1 }}>
                Compliance
              </Heading>
              {(overview.data?.compliance ?? []).length === 0 ? (
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  Nothing to check yet: the strip fills as the organization's
                  sign-in, admitted clients and audit export are configured.
                </Text>
              ) : (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {(overview.data?.compliance ?? []).map(check => (
                    <Box
                      key={check.name}
                      sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <Box
                        sx={{
                          color: check.ok ? 'success.fg' : 'attention.fg',
                          display: 'flex',
                        }}
                      >
                        {check.ok ? (
                          <CheckCircleIcon size={14} />
                        ) : (
                          <AlertIcon size={14} />
                        )}
                      </Box>
                      <Text sx={{ fontSize: 1 }}>{check.name}</Text>
                      {!check.ok && check.detail && (
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          {check.detail}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Metric
                label="Approvals waiting"
                value={overview.data?.approvalsWaiting ?? '—'}
                note="The queue arrives with durable execution"
              />
              <Metric
                label="Alerts firing"
                value={overview.data?.alertsFiring ?? '—'}
                note="Alert rules arrive with quotas"
              />
            </Box>
          </Box>
        ))}

      {current === 'usage' && (
        <OrganizationUsage
          errorState={errorState}
          orgUid={organization.uid}
          showTitle={false}
        />
      )}

      {current === 'teams' && (
        <TeamPolicies
          errorState={errorState}
          orgUid={organization.uid}
          readOnly={!roles.includes('organization_owner')}
        />
      )}

      {current === 'alerts' && (
        <AlertRules
          errorState={errorState}
          orgUid={organization.uid}
          readOnly={!roles.includes('organization_owner')}
        />
      )}

      {current === 'policy' && (
        <OrganizationPolicy
          errorState={errorState}
          orgUid={organization.uid}
          readOnly={!roles.includes('organization_owner')}
        />
      )}

      {current === 'service-agents' && (
        <ServiceAgents
          errorState={errorState}
          orgUid={organization.uid}
          readOnly={!roles.includes('organization_owner')}
        />
      )}

      {current === 'agents' &&
        (activity.isError ? (
          <McpErrorBlankslate
            state={errorState(activity.error, "The organization's agents")}
            onRetry={() => activity.refetch()}
          />
        ) : activity.isPending && !activity.data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <Spinner />
          </Box>
        ) : agentRows.length === 0 ? (
          <Blankslate border spacious>
            <Blankslate.Visual>
              <PlugIcon size="medium" />
            </Blankslate.Visual>
            <Blankslate.Heading>
              No agent acts for this organization
            </Blankslate.Heading>
            <Blankslate.Description>
              <Text sx={{ textAlign: 'center' }}>
                A member who authorizes a client while acting for{' '}
                {organization.name || organization.handle} appears here with the
                scopes the grant carries and what it last did.
              </Text>
            </Blankslate.Description>
          </Blankslate>
        ) : (
          <Table.Container>
            <Table.Title as="h4" id="org-agents">
              Agents
            </Table.Title>
            <Table.Subtitle as="p" id="org-agents-subtitle">
              {plural(agentRows.length, 'principal')} acting through MCP for
              this organization. A member's own grant is revoked by that member;
              revoking on their behalf arrives with the organization's agent
              directory.
            </Table.Subtitle>
            <DataTable
              aria-labelledby="org-agents"
              aria-describedby="org-agents-subtitle"
              data={agentRows}
              columns={agentColumns}
            />
          </Table.Container>
        ))}

      {current === 'audit' && (
        <AuditLog
          errorState={errorState}
          routes={routes}
          showTitle={false}
          subject={organization.name || organization.handle}
          filters={{ ...auditFilters, org: organization.uid }}
          onFiltersChange={filters =>
            onAuditFiltersChange({ ...filters, org: undefined })
          }
        />
      )}

      {current === 'observability' && (
        <McpObservability
          errorState={errorState}
          routes={routes}
          showTitle={false}
          org={organization.uid}
          pane={observabilityPane}
          onPaneChange={onObservabilityPaneChange}
          taskUid={observabilityTask}
          traceId={observabilityTrace}
          onSelect={onObservabilitySelect}
        />
      )}

      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Teams, Policies, Quotas, Alerts, Approvals and Runs join this console as
        the layers behind them ship. Identity — providers, group mapping, SCIM
        and session controls — comes last, with enterprise sign-in.
      </Text>
    </Box>
  );
};

export default EnterpriseConsole;
