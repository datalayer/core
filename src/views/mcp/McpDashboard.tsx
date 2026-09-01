/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the connected MCP clients are doing right now.
 *
 * One data call — `GET /api/mcp/v1/activity` — answers the whole page, so
 * the counts and the four panels can never disagree with each other, and
 * the home page's cards, which read the same query, can never disagree with
 * this. It is refetched every ten seconds as the fallback under the
 * ai-agents websocket, which patches the same cache entry.
 *
 * Top: the counts that answer "is anything happening". Then, in the idiom
 * of the runtimes tables, four panels: the clients with a live grant, the
 * tasks running, the sandboxes bound and the calls as they land. Each empty
 * state names the next step rather than saying "nothing here".
 *
 * Milestone 1 draws the clients, the sandboxes, the calls and the counts;
 * the running tasks and the live pane arrive with durable execution in
 * milestone 2 and say so where they will be.
 *
 * @module views/mcp/McpDashboard
 */

import { useMemo, useRef, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Heading,
  Label,
  Link,
  Select,
  Spinner,
  Text,
} from '@primer/react';
import { Blankslate, DataTable, Dialog, Table } from '@primer/react/experimental';
import type { DataTableProps } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import {
  ChecklistIcon,
  KebabHorizontalIcon,
  PlayIcon,
  PlugIcon,
  StackIcon,
  TelescopeIcon,
} from '@primer/octicons-react';
import { ClientBadge, McpErrorBlankslate } from '../../components/mcp';
import {
  useDisconnectAgent,
  useMcpActivity,
  useTerminateBinding,
} from '../../hooks/useMcp';
import { useNavigate, useToast } from '../../hooks';
import type { McpActiveClient } from '../../api/mcp';
import type { McpAuditEvent } from '../../models/McpAuditEvent';
import type { McpBinding } from '../../models/McpBinding';
import { clientStatusOf, durationLabel, plural, timeAgo } from './format';
import type { McpClientStatus } from './format';
import { DEFAULT_MCP_ROUTES, type McpErrorStateFn, type McpRoutes } from './types';

export interface McpDashboardProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where the surfaces this page links to live. */
  routes?: Partial<McpRoutes>;
  /** An owner's view of one organization, rather than the caller's own. */
  org?: string;
  /** Drawn without its heading, when the page around it carries one. */
  showTitle?: boolean;
  /**
   * Which part of the page to draw, when it is drawn as tabs.
   *
   * The whole thing on one page is a column of tables and blankslates that
   * a reader has to scroll past to find the one they came for; asked a
   * section, it draws only that. `'all'` keeps the single-page reading for
   * anywhere that still wants it.
   *
   * The counts stay with `'overview'` rather than repeating on each tab:
   * they are the answer to "is anything happening", which is the question
   * somebody has *before* choosing where to look.
   */
  section?: McpDashboardSection;
}

/** The parts of the dashboard, each its own tab. */
export type McpDashboardSection =
  | 'all'
  | 'overview'
  | 'agents'
  | 'runs'
  | 'sandboxes'
  | 'calls';

/** How a client's status is drawn. */
const STATUS_LOOK: Record<McpClientStatus, { label: string; variant: 'success' | 'attention' | 'secondary' }> = {
  active: { label: 'Active', variant: 'success' },
  idle: { label: 'Idle', variant: 'attention' },
  disconnected: { label: 'Disconnected', variant: 'secondary' },
};

/** What a client is working on, in one phrase. */
const boundTo = (client: McpActiveClient): string => {
  const call = client.lastCall;
  if (!call) {
    return '';
  }
  if (call.itemUid) {
    return `Notebook ${call.itemUid}`;
  }
  if (call.sourceUid) {
    return `Source ${call.sourceUid}`;
  }
  return '';
};

const countLook = (tone: 'neutral' | 'danger') =>
  tone === 'danger' ? 'danger.fg' : 'fg.default';

const Count = ({
  label,
  value,
  tone = 'neutral',
  note,
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'danger';
  note?: string;
}): JSX.Element => (
  <Box
    sx={{
      p: 3,
      border: '1px solid',
      borderColor: 'border.default',
      borderRadius: 2,
      bg: 'canvas.default',
      minWidth: 0,
    }}
  >
    <Text sx={{ display: 'block', fontSize: 4, fontWeight: 'bold', color: countLook(tone) }}>
      {value}
    </Text>
    <Text sx={{ display: 'block', fontSize: 0, color: 'fg.muted' }}>{label}</Text>
    {note && (
      <Text sx={{ display: 'block', fontSize: 0, color: 'fg.subtle', mt: 1 }}>{note}</Text>
    )}
  </Box>
);

/** A panel that has nothing to show, and the step that would fill it. */
const PanelEmpty = ({
  icon: Icon,
  heading,
  description,
  action,
}: {
  icon: typeof PlugIcon;
  heading: string;
  description: string;
  action?: { label: string; onClick: () => void };
}): JSX.Element => (
  <Blankslate border spacious>
    <Blankslate.Visual>
      <Icon size="medium" />
    </Blankslate.Visual>
    <Blankslate.Heading>{heading}</Blankslate.Heading>
    <Blankslate.Description>
      {/* `as="p"`: `Text` renders a span by default, and `text-align` does
          not apply to an inline element — the rule was here and doing
          nothing. */}
      <Text as="p" sx={{ textAlign: 'center', m: 0 }}>
        {description}
      </Text>
    </Blankslate.Description>
    {action && (
      <Button size="small" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Blankslate>
);

type ClientRow = McpActiveClient & { id: string; status: McpClientStatus };
type SandboxRow = McpBinding & { id: string };
type CallRow = McpAuditEvent & { id: string };

export const McpDashboard = ({
  errorState,
  routes,
  org,
  showTitle = true,
  section = 'all',
}: McpDashboardProps): JSX.Element => {
  const where = { ...DEFAULT_MCP_ROUTES, ...routes };
  /** Whether this section is being drawn — `'all'` draws every one. */
  const draws = (name: McpDashboardSection) => section === 'all' || section === name;
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const activity = useMcpActivity(org ? { org } : {});
  const disconnect = useDisconnectAgent();
  const terminate = useTerminateBinding();

  const [disconnecting, setDisconnecting] = useState<ClientRow | null>(null);
  const [terminating, setTerminating] = useState<SandboxRow | null>(null);
  const returnFocusRef = useRef<HTMLElement>(null);

  // The calls panel filters what is already in hand: the answer carries the
  // last fifty calls, so narrowing them is a matter of the browser, not of
  // another request.
  const [callClient, setCallClient] = useState('');
  const [callTool, setCallTool] = useState('');
  const [callOutcome, setCallOutcome] = useState('');

  const data = activity.data;

  const clients = useMemo<ClientRow[]>(
    () =>
      (data?.clients ?? []).map(client => ({
        ...client,
        id: client.clientId,
        status: clientStatusOf(client.lastCall?.at),
      })),
    [data?.clients],
  );

  const sandboxes = useMemo<SandboxRow[]>(
    () => (data?.sandboxes ?? []).map(binding => ({ ...binding, id: binding.uid })),
    [data?.sandboxes],
  );

  const calls = useMemo<CallRow[]>(
    () => (data?.calls ?? []).map(call => ({ ...call, id: call.uid })),
    [data?.calls],
  );

  const filteredCalls = useMemo(
    () =>
      calls.filter(
        call =>
          (!callClient || call.clientId === callClient) &&
          (!callTool || call.tool === callTool) &&
          (!callOutcome ||
            (callOutcome === 'refused'
              ? call.decision === 'refused'
              : call.outcome === callOutcome)),
      ),
    [calls, callClient, callTool, callOutcome],
  );

  const callTools = useMemo(
    () => [...new Set(calls.map(call => call.tool).filter(Boolean))].sort() as string[],
    [calls],
  );

  const auditFor = (call: McpAuditEvent): string => {
    const parameters = new URLSearchParams();
    if (call.taskId) {
      parameters.set('task', call.taskId);
    } else if (call.traceId) {
      parameters.set('trace', call.traceId);
    } else {
      if (call.clientId) {
        parameters.set('agent', call.clientId);
      }
      if (call.tool) {
        parameters.set('tool', call.tool);
      }
    }
    const search = parameters.toString();
    return search ? `${where.audit}?${search}` : where.audit;
  };

  const traceFor = (call: McpAuditEvent): string | null => {
    if (call.taskId) {
      return `${where.observability}?task=${encodeURIComponent(call.taskId)}`;
    }
    if (call.traceId) {
      return `${where.observability}?trace=${encodeURIComponent(call.traceId)}`;
    }
    return null;
  };

  const confirmDisconnect = () => {
    const client = disconnecting;
    if (!client?.grantUid) {
      return;
    }
    disconnect.mutate(client.grantUid, {
      onSuccess: () => {
        enqueueToast(`${client.clientName || client.clientId} is disconnected.`, {
          variant: 'success',
        });
        setDisconnecting(null);
      },
      onError: reason => {
        enqueueToast(`Could not disconnect: ${reason.message}`, { variant: 'error' });
        setDisconnecting(null);
      },
    });
  };

  const confirmTerminate = () => {
    const binding = terminating;
    if (!binding) {
      return;
    }
    terminate.mutate(binding.uid, {
      onSuccess: () => {
        enqueueToast(`Sandbox ${binding.uid} is terminated.`, { variant: 'success' });
        setTerminating(null);
      },
      onError: reason => {
        enqueueToast(`Could not terminate: ${reason.message}`, { variant: 'error' });
        setTerminating(null);
      },
    });
  };

  const clientColumns: DataTableProps<ClientRow>['columns'] = [
    {
      header: 'Client',
      field: 'clientId',
      rowHeader: true,
      renderCell: row => (
        <ClientBadge clientId={row.clientId} clientName={row.clientName} />
      ),
    },
    {
      header: 'Kind',
      id: 'kind',
      width: '110px',
      // Service agents are principals of an organization and arrive with
      // milestone 3; every grant IAM answers today is a delegation.
      renderCell: () => (
        <Label size="small" variant="secondary">
          Delegated
        </Label>
      ),
    },
    {
      header: 'Bound to',
      id: 'bound',
      width: 'growCollapse',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{boundTo(row) || '—'}</Text>
      ),
    },
    {
      header: 'Last tool',
      id: 'last-tool',
      renderCell: row =>
        row.lastCall ? (
          <Box sx={{ display: 'grid', gap: '2px', minWidth: 0 }}>
            <Text sx={{ fontSize: 0 }}>{row.lastCall.tool || row.lastCall.method}</Text>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{timeAgo(row.lastCall.at)}</Text>
          </Box>
        ) : (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Nothing yet</Text>
        ),
    },
    {
      header: 'Status',
      id: 'status',
      width: '120px',
      renderCell: row => (
        <Label size="small" variant={STATUS_LOOK[row.status].variant}>
          {STATUS_LOOK[row.status].label}
        </Label>
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
                  navigate(`${where.audit}?agent=${encodeURIComponent(row.clientId)}`)
                }
              >
                Audit
              </ActionList.Item>
              <ActionList.Divider />
              <ActionList.Item
                variant="danger"
                disabled={!row.grantUid}
                onSelect={() => setDisconnecting(row)}
              >
                Disconnect
              </ActionList.Item>
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      ),
    },
  ];

  const sandboxColumns: DataTableProps<SandboxRow>['columns'] = [
    {
      header: 'Handle',
      field: 'uid',
      rowHeader: true,
      renderCell: row => (
        <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>{row.uid}</Text>
      ),
    },
    {
      header: 'Provider',
      id: 'provider',
      width: '120px',
      renderCell: row => (
        <Text sx={{ fontSize: 0 }}>{row.sandboxProvider || 'datalayer'}</Text>
      ),
    },
    {
      header: 'Capabilities',
      id: 'capabilities',
      width: 'growCollapse',
      renderCell: row => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(row.capabilities ?? []).map(capability => (
            <Label key={capability} size="small" variant="secondary">
              {capability}
            </Label>
          ))}
          {(row.capabilities ?? []).length === 0 && (
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>—</Text>
          )}
        </Box>
      ),
    },
    {
      header: 'Last used',
      id: 'last-used',
      width: '120px',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {timeAgo(row.lastUsedAt ?? row.createdAt) || '—'}
        </Text>
      ),
    },
    {
      header: 'State',
      id: 'state',
      width: '150px',
      renderCell: row =>
        row.state === 'lost' ? (
          // The loss is a fact of the session, not a hiccup: it is named
          // with the error the next call was answered with.
          <Label size="small" variant="danger">
            SANDBOX_LOST
          </Label>
        ) : (
          <Label size="small" variant={row.state === 'active' ? 'success' : 'secondary'}>
            {row.state ?? 'active'}
          </Label>
        ),
    },
    {
      header: '',
      id: 'actions',
      width: '110px',
      align: 'end',
      renderCell: row => (
        <Button
          size="small"
          variant="danger"
          disabled={row.state === 'closed'}
          onClick={() => setTerminating(row)}
        >
          Terminate
        </Button>
      ),
    },
  ];

  const callColumns: DataTableProps<CallRow>['columns'] = [
    {
      header: 'Tool',
      field: 'tool',
      rowHeader: true,
      renderCell: row => (
        <Box sx={{ display: 'grid', gap: '2px', minWidth: 0 }}>
          <Text sx={{ fontSize: 1 }}>{row.tool || row.method}</Text>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{timeAgo(row.at)}</Text>
        </Box>
      ),
    },
    {
      header: 'Client',
      id: 'client',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{row.clientId || '—'}</Text>
      ),
    },
    {
      header: 'On',
      id: 'item',
      width: 'growCollapse',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {row.itemUid || row.sourceUid || '—'}
        </Text>
      ),
    },
    {
      header: 'Decision',
      id: 'decision',
      width: '110px',
      renderCell: row => (
        <Label size="small" variant={row.decision === 'refused' ? 'danger' : 'success'}>
          {row.decision}
        </Label>
      ),
    },
    {
      header: 'Outcome',
      id: 'outcome',
      width: '110px',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: row.outcome === 'ok' ? 'fg.muted' : 'danger.fg' }}>
          {row.outcome ?? '—'}
        </Text>
      ),
    },
    {
      header: 'Took',
      id: 'duration',
      width: '90px',
      renderCell: row => (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {durationLabel(row.durationMs) || '—'}
        </Text>
      ),
    },
    {
      header: '',
      id: 'links',
      width: '150px',
      align: 'end',
      renderCell: row => {
        const trace = traceFor(row);
        return (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Link
              as="button"
              sx={{ fontSize: 0, cursor: 'pointer' }}
              onClick={() => navigate(auditFor(row))}
            >
              Audit
            </Link>
            {trace && (
              <Link
                as="button"
                sx={{ fontSize: 0, cursor: 'pointer' }}
                onClick={() => navigate(trace)}
              >
                Trace
              </Link>
            )}
          </Box>
        );
      },
    },
  ];

  if (activity.isError) {
    return (
      <Box sx={{ display: 'grid', gap: 3 }}>
        <McpErrorBlankslate
          state={errorState(activity.error, 'MCP activity')}
          onRetry={() => activity.refetch()}
        />
      </Box>
    );
  }

  const loading = activity.isPending && !data;

  return (
    <Box sx={{ display: 'grid', gap: 4, minWidth: 0 }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            MCP
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            What the agents connected to your workspace are doing right now.
          </Text>
        </Box>
      )}

      {/* Is anything happening: the counts, before the detail of it. */}
      {draws('overview') && (loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: ['repeat(2, 1fr)', 'repeat(3, 1fr)', 'repeat(6, 1fr)'],
          }}
        >
          <Count label="Clients connected" value={clients.length} />
          <Count
            label="Sandboxes bound"
            value={sandboxes.filter(binding => (binding.state ?? 'active') === 'active').length}
          />
          <Count label="Tasks running" value={data?.tasks.length ?? 0} />
          <Count label="Calls today" value={data?.today.calls ?? 0} />
          <Count
            label="Refusals today"
            value={data?.today.refusals ?? 0}
            tone={(data?.today.refusals ?? 0) > 0 ? 'danger' : 'neutral'}
          />
          <Count label="Credits by agents" value={data?.today.credits ?? 0} note="today" />
        </Box>
      ))}

      {/* Connected clients */}
      {draws('agents') && !loading &&
        (clients.length > 0 ? (
          <Table.Container>
            <Table.Title as="h3" id="mcp-clients">
              Connected clients
            </Table.Title>
            <Table.Subtitle as="p" id="mcp-clients-subtitle">
              {plural(clients.length, 'client')} with a live grant on your workspace.
            </Table.Subtitle>
            <DataTable
              aria-labelledby="mcp-clients"
              aria-describedby="mcp-clients-subtitle"
              data={clients}
              columns={clientColumns}
            />
          </Table.Container>
        ) : (
          <PanelEmpty
            icon={PlugIcon}
            heading="No client connected"
            description="Connect Claude Code, Codex, Cursor, VS Code or any MCP client to your workspace, and it appears here on its first call."
            action={{ label: 'Set up a client', onClick: () => navigate(where.access) }}
          />
        ))}

      {/* Running now — the durable tasks of milestone 2. */}
      {draws('runs') && !loading && (
        <Box>
          <Heading as="h3" sx={{ fontSize: 1, mb: 2 }}>
            Running now
          </Heading>
          <PanelEmpty
            icon={PlayIcon}
            heading="Nothing is running"
            description={
              (data?.tasks.length ?? 0) > 0
                ? 'Tasks are running, and the live pane that shows their progress, their cell and their approvals arrives with durable execution in milestone 2.'
                : 'A tool call that outlives its request becomes a task you can watch, cancel and answer. Durable execution arrives in milestone 2; until then every call finishes inside its own request and is listed under Recent calls.'
            }
          />
        </Box>
      )}

      {/* Sandboxes bound */}
      {draws('sandboxes') && !loading &&
        (sandboxes.length > 0 ? (
          <Table.Container>
            <Table.Title as="h3" id="mcp-sandboxes">
              Sandboxes bound
            </Table.Title>
            <Table.Subtitle as="p" id="mcp-sandboxes-subtitle">
              The sessions your agents execute in. Terminating one ends its open work.
            </Table.Subtitle>
            <DataTable
              aria-labelledby="mcp-sandboxes"
              aria-describedby="mcp-sandboxes-subtitle"
              data={sandboxes}
              columns={sandboxColumns}
            />
          </Table.Container>
        ) : (
          <PanelEmpty
            icon={StackIcon}
            heading="No sandbox bound"
            description="An agent that launches a sandbox keeps it for the session; it appears here with its provider, its capabilities and what it is doing."
          />
        ))}

      {/* Recent calls */}
      {draws('calls') && !loading &&
        (calls.length > 0 ? (
          <Table.Container>
            <Table.Title as="h3" id="mcp-calls">
              Recent calls
            </Table.Title>
            <Table.Subtitle as="p" id="mcp-calls-subtitle">
              The last calls as they landed. Every one of them has an audit row that
              outlives this page.
            </Table.Subtitle>
            <Table.Actions>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Select
                  size="small"
                  aria-label="Filter by client"
                  value={callClient}
                  onChange={event => setCallClient(event.currentTarget.value)}
                >
                  <Select.Option value="">Every client</Select.Option>
                  {clients.map(client => (
                    <Select.Option key={client.clientId} value={client.clientId}>
                      {client.clientName || client.clientId}
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  size="small"
                  aria-label="Filter by tool"
                  value={callTool}
                  onChange={event => setCallTool(event.currentTarget.value)}
                >
                  <Select.Option value="">Every tool</Select.Option>
                  {callTools.map(tool => (
                    <Select.Option key={tool} value={tool}>
                      {tool}
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  size="small"
                  aria-label="Filter by outcome"
                  value={callOutcome}
                  onChange={event => setCallOutcome(event.currentTarget.value)}
                >
                  <Select.Option value="">Every outcome</Select.Option>
                  <Select.Option value="ok">Succeeded</Select.Option>
                  <Select.Option value="error">Failed</Select.Option>
                  <Select.Option value="refused">Refused</Select.Option>
                </Select>
              </Box>
            </Table.Actions>
            {filteredCalls.length > 0 ? (
              <DataTable
                aria-labelledby="mcp-calls"
                aria-describedby="mcp-calls-subtitle"
                data={filteredCalls}
                columns={callColumns}
              />
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'fg.muted', fontSize: 1 }}>
                No call matches these filters.
              </Box>
            )}
          </Table.Container>
        ) : (
          <PanelEmpty
            icon={ChecklistIcon}
            heading="No call yet"
            description="Ask your agent to list your notebooks. The call, its decision and its outcome land here and in the audit log."
            action={{ label: 'Open the audit log', onClick: () => navigate(where.audit) }}
          />
        ))}

      {!loading && (
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            size="small"
            leadingVisual={TelescopeIcon}
            onClick={() => navigate(where.observability)}
          >
            Observability
          </Button>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            Refreshed {timeAgo(data?.at) || 'just now'}, and again every ten seconds.
          </Text>
        </Box>
      )}

      {/* Disconnecting is a revocation: it is confirmed, and it is said what
          it does to the agent still holding a token. */}
      {disconnecting && (
        <Dialog
          title="Disconnect this client?"
          onClose={() => setDisconnecting(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            { buttonType: 'default', content: 'Keep it', onClick: () => setDisconnecting(null) },
            {
              buttonType: 'danger',
              content: 'Disconnect',
              onClick: confirmDisconnect,
              disabled: disconnect.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            {disconnecting.clientName || disconnecting.clientId} loses its grant at once.
            Its next call is refused; an access token it still holds dies with its own
            short expiry. Nothing it already did is undone.
          </Text>
        </Dialog>
      )}

      {terminating && (
        <Dialog
          title="Terminate this sandbox?"
          onClose={() => setTerminating(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            { buttonType: 'default', content: 'Keep it', onClick: () => setTerminating(null) },
            {
              buttonType: 'danger',
              content: 'Terminate',
              onClick: confirmTerminate,
              disabled: terminate.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            The runtime behind {terminating.uid} is stopped and its session closed. Work
            the agent has open there ends as <code>SANDBOX_LOST</code>; anything already
            written to a notebook stays.
          </Text>
        </Dialog>
      )}
    </Box>
  );
};

export default McpDashboard;
