/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Access › MCP: how to connect a client, and what your agents may reach.
 *
 * This is the *setup and access* page, not the dashboard. It answers "how
 * do I point my client at Datalayer" first — the endpoint, and one card per
 * client with the command that writes its configuration — and then, in five
 * summaries that link onward, "and what have they got": the agents
 * connected, the runs, the toolsets, the notebooks and sources shared with
 * an agent, and how the calls are behaving.
 *
 * What is happening *right now* is the dashboard's question, and the line
 * at the top of the page opens it rather than answering it twice.
 *
 * Each card degrades to an explanatory empty state: a card with nothing in
 * it says what would put something there.
 *
 * @module views/mcp/McpHome
 */

import { useState } from 'react';
import { Button, Heading, IconButton, Link, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import {
  CheckIcon,
  CopyIcon,
  KeyIcon,
  PlugIcon,
  PulseIcon,
  ShareIcon,
  TelescopeIcon,
  ToolsIcon,
} from '@primer/octicons-react';
import { useConnectedAgents, useMcpActivity, useMcpMetrics, useTasks } from '../../hooks/useMcp';
import { useNavigate } from '../../hooks';
import { useCoreStore, useIAMStore } from '../../state';
import { plural, timeAgo } from './format';
import { DEFAULT_MCP_ROUTES, type McpRoutes } from './types';

export interface McpHomeProps {
  routes?: Partial<McpRoutes>;
  /** Where the per-client manuals live; each client appends its own name. */
  clientDocsBase?: string;
  showTitle?: boolean;
  /**
   * Whether to draw the summary cards beneath the setup.
   *
   * Off where they have a page of their own. This page answers "how do I
   * connect one", and six cards about what connected agents are *doing* sat
   * under that question answering a different one — a reader looking for a
   * command scrolled past them, and a reader looking for the numbers had to
   * know they were filed under Access.
   */
  showSummaries?: boolean;
  /**
   * Whether to draw the setup half — the endpoint and the per-client cards.
   *
   * Off where only the summaries are wanted, which is how the MCP overview
   * mounts this: the two halves answer different questions and now live on
   * different tabs, and one component drawing either keeps the wording and
   * the data of each in one place rather than two that drift.
   */
  showSetup?: boolean;
}

/**
 * The clients the documentation carries a page for, in the order it lists
 * them, with the name `datalayer mcp setup` takes.
 */
export const MCP_CLIENTS: { name: string; setup: string }[] = [
  { name: 'Claude Code', setup: 'claude-code' },
  { name: 'Claude Desktop', setup: 'claude-desktop' },
  { name: 'Codex', setup: 'codex' },
  { name: 'Cursor', setup: 'cursor' },
  { name: 'VS Code', setup: 'vscode' },
  { name: 'Windsurf', setup: 'windsurf' },
  { name: 'Cline', setup: 'cline' },
];

const Copyable = ({ text }: { text: string }): JSX.Element => {
  const [copied, setCopied] = useState(false);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        bg: 'canvas.inset',
        borderRadius: 2,
        minWidth: 0,
      }}
    >
      <Text
        sx={{
          fontFamily: 'mono',
          fontSize: 0,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </Text>
      <IconButton
        size="small"
        variant="invisible"
        aria-label={copied ? 'Copied' : `Copy ${text}`}
        icon={copied ? CheckIcon : CopyIcon}
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      />
    </Box>
  );
};

/** One of the five summaries: a heading, what it holds, and the way in. */
const Summary = ({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof PlugIcon;
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}): JSX.Element => (
  <Box
    sx={{
      p: 3,
      border: '1px solid',
      borderColor: 'border.default',
      borderRadius: 2,
      display: 'grid',
      gap: 2,
      alignContent: 'start',
      minWidth: 0,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Icon size={16} />
      <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>{title}</Text>
    </Box>
    <Box sx={{ fontSize: 0, color: 'fg.muted', display: 'grid', gap: 1 }}>{children}</Box>
    {action && (
      <Box>
        <Link as="button" sx={{ fontSize: 0, cursor: 'pointer' }} onClick={action.onClick}>
          {action.label}
        </Link>
      </Box>
    )}
  </Box>
);

export const McpHome = ({
  routes,
  clientDocsBase = '/docs/mcp-clients',
  showTitle = true,
  showSummaries = true,
  showSetup = true,
}: McpHomeProps): JSX.Element => {
  const where = { ...DEFAULT_MCP_ROUTES, ...routes };
  const navigate = useNavigate();
  const endpoint = useCoreStore(state => state.configuration.jupyterMcpServerUrl);
  // Whether there is a token, never what it is: this page shows an address
  // and a status, and a credential belongs on neither.
  const signedIn = Boolean(useIAMStore(state => state.token));

  const agents = useConnectedAgents();
  const tasks = useTasks({ limit: 5 });
  const activity = useMcpActivity();
  const metrics = useMcpMetrics();

  const connected = agents.data ?? [];
  const runs = tasks.data?.items ?? [];
  const live = activity.data?.clients.length ?? 0;

  return (
    <Box sx={{ display: 'grid', gap: 4, minWidth: 0 }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            MCP
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            Connect your agents to your notebooks, data and sandboxes through the Model
            Context Protocol.
          </Text>
        </Box>
      )}

      {showSetup && (
        <>
        {/* What is going on now is one line and one link; the dashboard answers it. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
            p: 3,
            borderRadius: 2,
            bg: 'canvas.subtle',
            border: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <Text sx={{ fontSize: 1 }}>
            {live > 0
              ? `${plural(live, 'client')} connected right now.`
              : 'No client is connected right now.'}
          </Text>
          <Button size="small" leadingVisual={PulseIcon} onClick={() => navigate(where.dashboard)}>
            What is going on
          </Button>
        </Box>

        {/* The endpoint, and whether this browser is signed in to it. */}
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Heading as="h3" sx={{ fontSize: 2 }}>
            The endpoint
          </Heading>
          <Copyable text={endpoint || 'https://mcp.datalayer.run/mcp'} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <KeyIcon size={14} />
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              {signedIn
                ? 'You are signed in, so a client you set up from here authorizes through OAuth without a shared token.'
                : 'Sign in to authorize a client through OAuth; without it a client can only use a personal access token.'}
            </Text>
          </Box>
        </Box>

        {/* One card per client: the command that writes its configuration, and
            its manual for the format and the file it writes. */}
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Heading as="h3" sx={{ fontSize: 2 }}>
            Set up a client
          </Heading>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: ['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)'],
            }}
          >
            {MCP_CLIENTS.map(client => (
              <Box
                key={client.setup}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  display: 'grid',
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>{client.name}</Text>
                <Copyable text={`datalayer mcp setup ${client.setup}`} />
                <Link
                  as="button"
                  sx={{ fontSize: 0, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => navigate(`${clientDocsBase}/${client.setup}`)}
                >
                  Configuration and authorization
                </Link>
              </Box>
            ))}
          </Box>
        </Box>
        </>
      )}

      {showSummaries && (
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: ['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)'],
        }}
      >
        <Summary
          icon={PlugIcon}
          title="Agents"
          action={{ label: 'Connected agents', onClick: () => navigate(where.agents) }}
        >
          {connected.length === 0 ? (
            <Text>
              No agent has been authorized yet. Set up a client above and approve the
              scopes it asks for.
            </Text>
          ) : (
            <>
              <Text>{plural(connected.length, 'agent')} authorized.</Text>
              {connected.slice(0, 3).map(agent => (
                <Text key={agent.uid}>
                  {agent.clientName || agent.clientId} —{' '}
                  {agent.lastUsedAt ? `used ${timeAgo(agent.lastUsedAt)}` : 'never used'}
                </Text>
              ))}
            </>
          )}
        </Summary>

        <Summary
          icon={PulseIcon}
          title="Runs"
          action={{ label: 'All runs', onClick: () => navigate(where.runs) }}
        >
          {runs.length === 0 ? (
            <Text>
              Nothing has run yet. A tool call that outlives its request becomes a run
              you can watch and cancel.
            </Text>
          ) : (
            runs.map(task => (
              <Text key={task.uid}>
                {task.tool} — {task.status} {timeAgo(task.lastUpdatedAt)}
              </Text>
            ))
          )}
        </Summary>

        <Summary
          icon={TelescopeIcon}
          title="Observability"
          action={{ label: 'Runs and metrics', onClick: () => navigate(where.observability) }}
        >
          <Text>
            {metrics.data?.slis.samples.calls
              ? `${plural(metrics.data.slis.samples.calls, 'call')} measured.`
              : 'No call measured yet.'}
          </Text>
          <Text>
            {metrics.data?.slis.p95CallDurationMs
              ? `p95 ${Math.round(metrics.data.slis.p95CallDurationMs)}ms`
              : 'Latency not measured yet.'}
          </Text>
          <Text>
            {metrics.data?.slis.availability === null ||
            metrics.data?.slis.availability === undefined
              ? 'Error rate not measured yet.'
              : `${((1 - metrics.data.slis.availability) * 100).toFixed(1)}% of calls failed.`}
          </Text>
        </Summary>

        <Summary icon={ToolsIcon} title="Tools">
          <Text>
            The toolsets an agent may execute — the Contents sources you have enabled
            for it, their tools, their approval policy and their health — are managed
            here once toolset bindings ship.
          </Text>
        </Summary>

        <Summary icon={ShareIcon} title="Reach">
          <Text>
            Which notebooks and sources an agent can actually reach, as a list you can
            read at a glance, arrives with sharing to agents as principals.
          </Text>
        </Summary>

        <Summary
          icon={KeyIcon}
          title="Policies"
          action={{ label: 'What applies', onClick: () => navigate(where.policies) }}
        >
          <Text>
            What your agents are allowed to do, and which layer decided each rule.
          </Text>
        </Summary>
      </Box>
      )}
    </Box>
  );
};

export default McpHome;
