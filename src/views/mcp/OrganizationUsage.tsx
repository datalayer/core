/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the organization used, against what it may — and which agent used it.
 *
 * The console had a role called `organization_usage_reviewer` and no page of
 * usage: the reviewer was sent to the Overview, which counts runs and
 * refusals and says nothing about a limit. A budget with no spend against it
 * is a number somebody set once.
 *
 * The breakdown underneath is the half that decides anything. A quota bar at
 * ninety percent tells an administrator to act; it does not say what to turn
 * off. The rows name the agents, biggest spender first, because that is the
 * order the question is asked in.
 *
 * **Unreadable is not zero.** A figure the gateway could not read is drawn
 * as "not available" with the reason, never as a blank or a 0 — they look
 * the same in a dashboard and mean opposite things. For the same reason the
 * breakdown is hidden entirely when the total could not be read: the parts
 * under an unreadable whole make every agent look cheap, and a reader
 * concludes the budget is fine.
 *
 * Limits are **changed in IAM**, not here. The page says where.
 *
 * @module views/mcp/OrganizationUsage
 */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { Heading, Label, ProgressBar, Spinner, Text } from '@primer/react';
import { Blankslate, DataTable, Table } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { GraphIcon } from '@primer/octicons-react';
import { ClientBadge, McpErrorBlankslate } from '../../components/mcp';
import { useOrgMcpUsage } from '../../hooks/useMcp';
import type {
  McpAgentSpend,
  McpOrganizationUsage,
  McpQuota,
} from '../../api/mcp/organizations';
import { type McpErrorStateFn } from './types';

export interface OrganizationUsageProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** The organization whose use this is. */
  orgUid: string;
  /** One team of it, rather than all of them. */
  teamUid?: string;
  /** Drawn without its heading, when the page around it carries one. */
  showTitle?: boolean;
}

/** The quotas, in the order they are read. */
const QUOTAS = [
  {
    key: 'creditsPerDay' as const,
    label: 'Credits today',
    // Named so the reader knows the window without reading the number: a
    // daily budget and a monthly one differ by thirty, and the mistake is
    // silent.
    hint: 'Against the daily budget',
  },
  {
    key: 'concurrentSandboxes' as const,
    label: 'Sandboxes running',
    hint: 'Against the concurrency limit',
  },
  {
    key: 'callsPerMinute' as const,
    label: 'Calls per minute',
    // The gateway reports this limit without a use, and says why: the
    // windows are per subject, so an organization's "calls this minute" is
    // a sum over subjects that changes while it is being read.
    hint: 'The cap; refusals are where you meet it',
  },
];

export type SpendRow = McpAgentSpend & { id: string };

/** Two decimals for credits, none for counts. */
export const amount = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

/**
 * How close to the limit, said in colour.
 *
 * Three bands rather than a gradient: a reader acts at "nearly there" and
 * not at eighty-one percent, and a bar that reddens smoothly gives them no
 * moment to act on.
 */
export const quotaTone = (
  fraction: number,
): 'success' | 'attention' | 'danger' =>
  fraction >= 0.9 ? 'danger' : fraction >= 0.75 ? 'attention' : 'success';

/**
 * What the breakdown should show: the rows, nothing, or a refusal to guess.
 *
 * `unreadable` is not `empty`. The gateway sends no rows in both cases —
 * because nobody spent anything, or because it could not read the ledger —
 * and drawing them the same way tells a reader "your agents were quiet"
 * when the truth is "we cannot tell you". They act on that differently.
 */
export const breakdownState = (
  usage: McpOrganizationUsage | undefined,
): 'unreadable' | 'empty' | 'rows' => {
  if (!usage || usage.quotas?.creditsPerDay?.unknown) {
    return 'unreadable';
  }
  return (usage.byAgent ?? []).length > 0 ? 'rows' : 'empty';
};

/**
 * The rows, keyed the way the gateway grouped them.
 *
 * The agent uid first: service agents reach Runtimes through the gateway and
 * carry *its* client id, so keying on that would collapse an organization's
 * pipelines into one row costing the sum of several.
 */
export const spendRowsOf = (byAgent: McpAgentSpend[]): SpendRow[] =>
  byAgent.map((entry, index) => ({
    ...entry,
    id: entry.agentUid || entry.clientId || String(index),
  }));

const QuotaCard = ({
  label,
  hint,
  quota,
}: {
  label: string;
  hint: string;
  quota?: McpQuota;
}): JSX.Element => {
  const limit = quota?.limit;
  const used = quota?.used;
  const fraction = quota?.fraction;
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        p: 3,
        flex: '1 1 220px',
        minWidth: 0,
      }}
    >
      <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{label}</Text>
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'baseline', gap: 2 }}>
        {quota?.unknown ? (
          <Text sx={{ fontSize: 2, color: 'fg.muted' }}>Not available</Text>
        ) : (
          <>
            <Text sx={{ fontSize: 4, fontWeight: 'bold' }}>
              {typeof used === 'number' ? amount(used) : '—'}
            </Text>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
              {typeof limit === 'number'
                ? `of ${amount(limit)}`
                : 'no limit set'}
            </Text>
          </>
        )}
      </Box>
      {typeof fraction === 'number' && (
        <Box sx={{ mt: 2 }}>
          <ProgressBar
            progress={Math.min(100, fraction * 100)}
            barSize="small"
            bg={`${quotaTone(fraction)}.emphasis`}
            aria-label={`${label}: ${Math.round(fraction * 100)}% of the limit`}
          />
        </Box>
      )}
      <Text as="p" sx={{ mt: 2, mb: 0, fontSize: 0, color: 'fg.muted' }}>
        {quota?.unknown ? quota.unknown : hint}
      </Text>
    </Box>
  );
};

export const OrganizationUsage = ({
  errorState,
  orgUid,
  teamUid,
  showTitle = true,
}: OrganizationUsageProps): JSX.Element => {
  const usage = useOrgMcpUsage(orgUid, teamUid ? { team: teamUid } : {});

  const rows = useMemo(
    () => spendRowsOf(usage.data?.byAgent ?? []),
    [usage.data],
  );

  if (usage.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <Spinner />
      </Box>
    );
  }
  if (usage.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(usage.error, 'The usage')}
        onRetry={() => void usage.refetch()}
      />
    );
  }

  const quotas = usage.data?.quotas ?? {};
  const breakdown = breakdownState(usage.data);

  return (
    <Box>
      {showTitle && (
        <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
          Usage
        </Heading>
      )}
      <Text as="p" sx={{ color: 'fg.muted', mt: 0, mb: 3 }}>
        What this organization&apos;s agents used over the last day, against
        what they may use. Limits are set in the organization&apos;s MCP policy,
        not here.
      </Text>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {QUOTAS.map(quota => (
          <QuotaCard
            key={quota.key}
            label={quota.label}
            hint={quota.hint}
            quota={quotas[quota.key]}
          />
        ))}
      </Box>

      <Heading as="h3" sx={{ fontSize: 2, mt: 4, mb: 2 }}>
        Credits by agent
      </Heading>
      {breakdown === 'unreadable' ? (
        <Blankslate border>
          <Blankslate.Visual>
            <GraphIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>
            The day&apos;s spend could not be read
          </Blankslate.Heading>
          <Blankslate.Description>
            <Text as="p" sx={{ textAlign: 'center' }}>
              A breakdown of a total nobody could read would make every agent
              look cheap. Try again in a moment.
            </Text>
          </Blankslate.Description>
        </Blankslate>
      ) : breakdown === 'empty' ? (
        <Blankslate border>
          <Blankslate.Visual>
            <GraphIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>No agent spent credits today</Blankslate.Heading>
          <Blankslate.Description>
            <Text as="p" sx={{ textAlign: 'center' }}>
              Work a person ran themselves is in the total above, and is not an
              agent&apos;s.
            </Text>
          </Blankslate.Description>
        </Blankslate>
      ) : (
        <Table.Container>
          <DataTable
            aria-labelledby="usage-by-agent"
            data={rows}
            columns={[
              {
                header: 'Agent',
                field: 'clientId',
                rowHeader: true,
                renderCell: row =>
                  row.clientId ? (
                    <ClientBadge clientId={row.clientId} />
                  ) : (
                    <Label variant="secondary">{row.agentUid}</Label>
                  ),
              },
              {
                header: 'Credits',
                field: 'credits',
                renderCell: row => amount(row.credits),
              },
              {
                header: 'Records',
                field: 'records',
                renderCell: row => String(row.records),
              },
            ]}
          />
        </Table.Container>
      )}
    </Box>
  );
};

export default OrganizationUsage;
