/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The agents a person has connected, and the one action that matters:
 * disconnecting one.
 *
 * A grant is not a setting — it is authority a person handed to a piece of
 * software — so the table says which client holds it, what it was allowed
 * to do, when it last used it, and how its identity was established. A
 * client registered by Client ID Metadata Document *is* its URL, and the
 * URL is what is shown as its id: the host is the part nobody can invent.
 *
 * Disconnecting revokes the grant. The refresh token stops working at once
 * and the next call is refused; an access token the agent still holds dies
 * with its own short expiry, which is why they are short. The dialog says
 * so rather than implying an instantaneous kill.
 *
 * @module views/mcp/ConnectedAgents
 */

import type { JSX } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Heading,
  Label,
  RelativeTime,
  Spinner,
  Text,
} from '@primer/react';
import {
  Blankslate,
  DataTable,
  Dialog,
  Table,
} from '@primer/react/experimental';
import type { DataTableProps } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { KebabHorizontalIcon, PlugIcon } from '@primer/octicons-react';
import {
  ClientBadge,
  McpErrorBlankslate,
  ScopeList,
} from '../../components/mcp';
import {
  useConnectedAgents,
  useDisconnectAgent,
  useDisconnectEveryAgent,
} from '../../hooks/useMcp';
import { useNavigate, useToast } from '../../hooks';
import type { ConnectedAgent } from '../../api/iam/connectedAgents';
import { type McpErrorStateFn, type McpRoutes } from './types';

export interface ConnectedAgentsProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /** Drawn without its heading, when the page around it carries one. */
  showTitle?: boolean;
  /**
   * Read-only: an owner looking at the delegated grants of an
   * organization's members may see them, and asks the member to revoke.
   */
  readOnly?: boolean;
}

type AgentRow = ConnectedAgent & { id: string };

export const ConnectedAgents = ({
  errorState,
  routes,
  showTitle = true,
  readOnly = false,
}: ConnectedAgentsProps): JSX.Element => {
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const agents = useConnectedAgents();
  const disconnect = useDisconnectAgent();
  const disconnectEvery = useDisconnectEveryAgent();
  const [disconnecting, setDisconnecting] = useState<AgentRow | null>(null);
  const [disconnectingEvery, setDisconnectingEvery] = useState(false);
  // Primer 37 types Dialog's focus refs with React 18's non-nullable
  // `RefObject<HTMLElement>`. React 19's `useRef(null)` is nullable, and this
  // ref is only handed to Dialog, so narrow it once here.
  const returnFocusRef = useRef<HTMLElement>(
    null,
  ) as React.RefObject<HTMLElement>;

  const rows = useMemo<AgentRow[]>(
    () => (agents.data ?? []).map(agent => ({ ...agent, id: agent.uid })),
    [agents.data],
  );

  const confirmDisconnectEvery = () => {
    disconnectEvery.mutate(undefined, {
      onSuccess: answer => {
        enqueueToast(
          answer.revoked === 1
            ? '1 agent disconnected.'
            : `${answer.revoked} agents disconnected.`,
          { variant: 'success' },
        );
        setDisconnectingEvery(false);
      },
      onError: error => {
        setDisconnectingEvery(false);
        enqueueToast(`Could not disconnect: ${error.message}`, {
          variant: 'error',
        });
      },
    });
  };

  const confirmDisconnect = () => {
    const agent = disconnecting;
    if (!agent) {
      return;
    }
    disconnect.mutate(agent.uid, {
      onSuccess: () => {
        enqueueToast(`${agent.clientName || agent.clientId} is disconnected.`, {
          variant: 'success',
        });
        setDisconnecting(null);
      },
      onError: reason => {
        enqueueToast(`Could not disconnect: ${reason.message}`, {
          variant: 'error',
        });
        setDisconnecting(null);
      },
    });
  };

  const columns: DataTableProps<AgentRow>['columns'] = [
    {
      header: 'Client',
      field: 'clientId',
      rowHeader: true,
      renderCell: row => (
        <ClientBadge
          clientId={row.clientId}
          clientName={row.clientName}
          registration={row.registration}
          clientHostname={row.clientHostname}
        />
      ),
    },
    {
      header: 'Kind',
      id: 'kind',
      width: '110px',
      // Every grant IAM answers here is a delegation of the signed-in
      // person; an organization's service agents are its own principals and
      // are listed on the organization's page from milestone 3.
      renderCell: () => (
        <Label size="small" variant="secondary">
          Delegated
        </Label>
      ),
    },
    {
      header: 'Allowed to',
      id: 'scopes',
      width: 'growCollapse',
      renderCell: row => <ScopeList scopes={row.scopes} />,
    },
    {
      header: 'Connected',
      id: 'created',
      width: '130px',
      renderCell: row =>
        row.createdAt ? (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            <RelativeTime datetime={row.createdAt} />
          </Text>
        ) : (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>—</Text>
        ),
    },
    {
      header: 'Last used',
      id: 'last-used',
      width: '130px',
      renderCell: row =>
        row.lastUsedAt ? (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            <RelativeTime datetime={row.lastUsedAt} />
          </Text>
        ) : (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Never</Text>
        ),
    },
    {
      header: '',
      id: 'actions',
      width: '48px',
      align: 'end',
      renderCell: row => (
        <ActionMenu>
          <ActionMenu.Anchor>
            <Button
              variant="invisible"
              size="small"
              aria-label={`Actions for ${row.clientName || row.clientId}`}
              icon={KebabHorizontalIcon}
            />
          </ActionMenu.Anchor>
          <ActionMenu.Overlay align="end">
            <ActionList>
              <ActionList.Item
                onSelect={() =>
                  navigate(
                    `${routes.runs}?agent=${encodeURIComponent(row.clientId)}`,
                  )
                }
              >
                Runs
              </ActionList.Item>
              <ActionList.Item
                onSelect={() =>
                  navigate(
                    `${routes.audit}?agent=${encodeURIComponent(row.clientId)}`,
                  )
                }
              >
                Audit
              </ActionList.Item>
              {!readOnly && (
                <>
                  <ActionList.Divider />
                  <ActionList.Item
                    variant="danger"
                    onSelect={() => setDisconnecting(row)}
                  >
                    Disconnect
                  </ActionList.Item>
                </>
              )}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      ),
    },
  ];

  if (agents.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(agents.error, 'Connected agents')}
        onRetry={() => agents.refetch()}
      />
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      {showTitle && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'start',
            justifyContent: 'space-between',
            gap: 3,
          }}
        >
          <Box>
            <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
              Connected Agents
            </Heading>
            <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
              Every agent you have authorized, what it may do, and when it last
              did it.
            </Text>
          </Box>
          {!readOnly && rows.length > 0 && (
            <Button
              variant="danger"
              onClick={() => setDisconnectingEvery(true)}
              disabled={disconnectEvery.isPending}
            >
              Disconnect all
            </Button>
          )}
        </Box>
      )}

      {agents.isPending && !agents.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : rows.length > 0 ? (
        <Table.Container>
          <Table.Title as="h3" id="connected-agents">
            Agents
          </Table.Title>
          <Table.Subtitle as="p" id="connected-agents-subtitle">
            An agent acts with exactly the access of the person who authorized
            it, and no more.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="connected-agents"
            aria-describedby="connected-agents-subtitle"
            data={rows}
            columns={columns}
          />
        </Table.Container>
      ) : (
        <Blankslate border spacious>
          <Blankslate.Visual>
            <PlugIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>No agent connected</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>
              Connect an MCP client and approve the scopes it asks for; the
              grant appears here and can be revoked from here.
            </Text>
          </Blankslate.Description>
          <Button size="small" onClick={() => navigate(routes.access)}>
            Connect an agent
          </Button>
        </Blankslate>
      )}

      {/* Narrowing a grant — re-consent with fewer scopes — is the other half
          of this table and arrives with the organization policy. */}
      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Narrowing a grant to fewer scopes without disconnecting arrives with the
        organization policy.
      </Text>

      {disconnecting && (
        <Dialog
          title="Disconnect this agent?"
          onClose={() => setDisconnecting(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Keep it',
              onClick: () => setDisconnecting(null),
            },
            {
              buttonType: 'danger',
              content: 'Disconnect',
              onClick: confirmDisconnect,
              disabled: disconnect.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            {disconnecting.clientName || disconnecting.clientId} loses its grant
            at once and its next call is refused. An access token it still holds
            dies with its own short expiry. The other agents are untouched, and
            nothing this one already did is undone.
          </Text>
        </Dialog>
      )}

      {disconnectingEvery && (
        <Dialog
          title="Disconnect every agent?"
          onClose={() => setDisconnectingEvery(false)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Keep them',
              onClick: () => setDisconnectingEvery(false),
            },
            {
              buttonType: 'danger',
              content: 'Disconnect all',
              onClick: confirmDisconnectEvery,
              disabled: disconnectEvery.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            Every agent you have authorized loses its grant at once — signing
            out everywhere. Each will ask again the next time you connect it,
            and this time it goes through the approval screen rather than being
            answered from what you agreed before, so this is also how you force
            a fresh approval.
          </Text>
          <Text as="p" sx={{ fontSize: 1, color: 'fg.muted', mt: 2, mb: 0 }}>
            Yours only. Nobody else&rsquo;s sessions end, in this organization
            or any other, and nothing any agent already did is undone.
          </Text>
        </Dialog>
      )}
    </Box>
  );
};

export default ConnectedAgents;
