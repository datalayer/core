/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an agent may actually call, in one space or one organization.
 *
 * A source is not exposed to agents because it exists. Somebody allows a set
 * of its tools on the source, and each session an agent opens narrows that
 * further. This is where those two lists are read together — because the
 * only list that matters is their **intersection**, and neither record shows
 * it on its own.
 *
 * That gap is not theoretical. Contents computes the effective policy as
 * `session ∩ source` and refuses anything outside it, so a tool removed from
 * the source after a session opened goes on sitting in that session's
 * `allowedTools` and is refused at every call. A page that drew the session's
 * list would show a tool the agent cannot use, and the person debugging it
 * would be reading a page that agreed with them.
 *
 * **An empty allowlist allows nothing.** It is not "unrestricted", here or
 * in Contents: `check_tool` refuses every tool not in the list, so a session
 * whose effective set is empty can call none of them. Said plainly on the
 * row, because the opposite reading is the natural one and it is the
 * dangerous direction to be wrong in.
 *
 * @module views/mcp/ToolAccess
 */

import type { JSX } from 'react';
import { useState } from 'react';
import {
  Button,
  Heading,
  Label,
  Spinner,
  Text,
  Truncate,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useContentSources,
  useMcpSessions,
  useMcpTools,
  useRevokeMcpSession,
} from '../../hooks/useContents';
import type {
  CatalogSource,
  ContentSource,
  EffectivePermissions,
  McpConfiguration,
  McpSession,
} from '../../api/contents/generated';
import { type McpErrorStateFn } from './types';

/**
 * The tools a session can really call: what it was granted, still allowed by
 * the source.
 *
 * The same intersection Contents applies, computed here so the page shows
 * what will happen rather than what was asked for. Sorted, so two sessions
 * of the same source read the same way.
 */
export const effectiveTools = (
  sessionAllowed: readonly string[] | null | undefined,
  sourceAllowed: readonly string[] | null | undefined,
): string[] => {
  const source = new Set(sourceAllowed ?? []);
  return [...new Set(sessionAllowed ?? [])].filter(tool => source.has(tool)).sort();
};

/**
 * The tools a session still lists that its source has stopped allowing.
 *
 * Worth its own answer rather than a subtraction at the call site: this is
 * the set that makes an agent fail in a way nobody can explain from either
 * record alone, and naming it is the whole reason to read the two together.
 */
export const withdrawnTools = (
  sessionAllowed: readonly string[] | null | undefined,
  sourceAllowed: readonly string[] | null | undefined,
): string[] => {
  const source = new Set(sourceAllowed ?? []);
  return [...new Set(sessionAllowed ?? [])].filter(tool => !source.has(tool)).sort();
};

/** How a source's approval policy reads to somebody deciding whether to trust it. */
export const APPROVAL_POLICY_LOOK: Record<
  McpConfiguration['approvalPolicy'],
  { label: string; variant: 'attention' | 'success' | 'secondary'; note: string }
> = {
  explicit: {
    label: 'Approval required',
    variant: 'attention',
    note: 'Every call waits for somebody to allow it.',
  },
  'auto-allowlisted': {
    label: 'Allowlisted',
    variant: 'success',
    note: 'Calls to allowed tools run; anything else is refused.',
  },
  never: {
    label: 'No approval',
    variant: 'secondary',
    note: 'Calls to allowed tools run without asking.',
  },
};

/** The MCP configuration of a source, where it has one. */
export const mcpConfigOf = (source: ContentSource): McpConfiguration | undefined =>
  source.kind === 'mcp'
    ? (source.configuration as McpConfiguration)
    : undefined;

const SessionRow = ({
  session,
  sourceTools,
  mayRevoke,
  onRevoke,
  revoking,
}: {
  session: McpSession;
  sourceTools: readonly string[];
  mayRevoke: boolean;
  onRevoke: () => void;
  revoking: boolean;
}): JSX.Element => {
  const effective = effectiveTools(session.allowedTools, sourceTools);
  const withdrawn = withdrawnTools(session.allowedTools, sourceTools);
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        py: 2,
        borderTop: '1px solid',
        borderColor: 'border.muted',
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Label size="small" variant={session.status === 'active' ? 'success' : 'secondary'}>
          {session.status}
        </Label>
        <Truncate title={session.actorUid} sx={{ fontSize: 0, fontFamily: 'mono', maxWidth: '16rem' }}>
          {session.actorUid}
        </Truncate>
        {session.status === 'active' && mayRevoke && (
          <Button size="small" variant="danger" disabled={revoking} onClick={onRevoke}>
            {revoking ? 'Revoking…' : 'Revoke'}
          </Button>
        )}
      </Box>
      {effective.length === 0 ? (
        <Text sx={{ fontSize: 0, color: 'attention.fg' }}>
          This session can call nothing. An empty allowlist allows no tool —
          it does not mean unrestricted.
        </Text>
      ) : (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {effective.map(tool => (
            <Label key={tool} size="small" variant="secondary">
              {tool}
            </Label>
          ))}
        </Box>
      )}
      {withdrawn.length > 0 && (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          Refused at every call, because the source no longer allows{' '}
          {withdrawn.join(', ')} — the session still lists it.
        </Text>
      )}
    </Box>
  );
};

const SourceCard = ({
  source,
  permissions,
  errorState,
}: {
  source: ContentSource;
  permissions: EffectivePermissions;
  errorState: McpErrorStateFn;
}): JSX.Element => {
  const config = mcpConfigOf(source);
  const sourceTools = config?.allowedTools ?? [];
  const sessions = useMcpSessions({ sourceUid: source.uid });
  const revoke = useRevokeMcpSession();
  const manifest = useMcpTools(source.uid);
  const [revoking, setRevoking] = useState('');
  const look = config ? APPROVAL_POLICY_LOOK[config.approvalPolicy] : undefined;
  const offered = manifest.data?.tools?.length ?? 0;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        p: 3,
        display: 'grid',
        gap: 2,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Heading as="h3" sx={{ fontSize: 1 }}>
          {source.name}
        </Heading>
        {look && (
          <Label size="small" variant={look.variant}>
            {look.label}
          </Label>
        )}
        {config?.transport && (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{config.transport}</Text>
        )}
      </Box>
      {look && (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{look.note}</Text>
      )}

      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
        {sourceTools.length === 0
          ? 'No tool is allowed on this source, so an agent can call none of it.'
          : `${sourceTools.length} of ${offered || sourceTools.length} tools allowed to agents.`}
      </Text>
      {sourceTools.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {[...sourceTools].sort().map(tool => (
            <Label key={tool} size="small" variant="accent">
              {tool}
            </Label>
          ))}
        </Box>
      )}

      <Box>
        <Heading as="h4" sx={{ fontSize: 0, color: 'fg.muted', mb: 1 }}>
          Open sessions
        </Heading>
        {sessions.isError ? (
          <McpErrorBlankslate
            state={errorState(sessions.error, 'The sessions')}
            onRetry={() => sessions.refetch()}
          />
        ) : sessions.isPending ? (
          <Spinner size="small" />
        ) : (sessions.data?.items.length ?? 0) === 0 ? (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            No agent has opened this source.
          </Text>
        ) : (
          (sessions.data?.items ?? []).map(session => (
            <SessionRow
              key={session.uid}
              session={session}
              sourceTools={sourceTools}
              // Revoking a session withdraws an agent's access to this
              // source, so it follows the source's own write permission
              // rather than being offered to everyone who can read the page.
              mayRevoke={permissions.update || permissions.isOwner}
              revoking={revoking === session.uid}
              onRevoke={() => {
                setRevoking(session.uid);
                revoke.mutate(session.uid, {
                  onSettled: () => setRevoking(''),
                });
              }}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export interface ToolAccessProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** One space's sources, rather than every source the caller can see. */
  spaceUid?: string;
}

export const ToolAccess = ({
  errorState,
  spaceUid,
}: ToolAccessProps): JSX.Element => {
  const sources = useContentSources({ kind: 'mcp', ...(spaceUid ? { spaceUid } : {}) });
  // The listing wraps each source with what this caller may do with it, and
  // both halves are used: the source to read the allowlist, the permissions
  // to decide whether revoking is offered at all.
  const items = (sources.data?.items ?? []) as CatalogSource[];

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      <Box>
        <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
          Tools
        </Heading>
        <Text as="p" sx={{ fontSize: 1, color: 'fg.muted', m: 0 }}>
          The MCP sources your agents may reach, the tools allowed on each, and
          the sessions open against them. A session can only narrow what the
          source allows, never widen it.
        </Text>
      </Box>

      {sources.isError ? (
        <McpErrorBlankslate
          state={errorState(sources.error, 'The sources')}
          onRetry={() => sources.refetch()}
        />
      ) : sources.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : items.length === 0 ? (
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          No MCP source is connected here. A source has to be created before
          its tools can be offered to an agent.
        </Text>
      ) : (
        items.map(entry => (
          <SourceCard
            key={entry.source.uid}
            source={entry.source}
            permissions={entry.permissions}
            errorState={errorState}
          />
        ))
      )}
    </Box>
  );
};

export default ToolAccess;
