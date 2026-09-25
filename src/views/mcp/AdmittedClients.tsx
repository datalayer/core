/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the admitted-clients list actually admits.
 *
 * The field above it is a textarea of client ids, because that is what they
 * are: a client id is a URL somebody pastes, and there is nothing to pick
 * from. What a textarea cannot do is tell whoever typed it whether an entry
 * resolves — and this is the one policy rule whose typo fails silently in
 * the direction that matters. A misspelled entry does not refuse anything
 * loudly; it never matches, and every agent from that vendor is turned away
 * with "your organization does not admit this client", which reads to its
 * owner as a decision somebody made on purpose.
 *
 * So each stored entry is shown with what it names. Three states, and the
 * reason this is a component rather than a line of text is that collapsing
 * any two of them misleads:
 *
 * * a **hostname** admits every client that host publishes. There is no
 *   document and none is expected — shown as unresolved it would send
 *   somebody chasing a fetch that was never going to happen.
 * * a **document that resolves**, with the name and publishing host.
 * * a **document that does not**, with the reason. The state the whole
 *   thing is for.
 *
 * **It describes what is stored, not the draft.** Resolving on every
 * keystroke would make a textarea a source of outbound requests, so this
 * goes stale while somebody edits and says so rather than pretending to
 * describe a line that has not been saved.
 *
 * @module views/mcp/AdmittedClients
 */

import type { JSX } from 'react';
import { Label, Link, Spinner, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import {
  AlertIcon,
  CheckCircleIcon,
  GlobeIcon,
  QuestionIcon,
} from '@primer/octicons-react';

import { useAdmittedClients } from '../../hooks/useMcp';
import type { AdmittedClient, McpPolicyScope } from '../../api/iam/mcpPolicy';

export interface AdmittedClientsProps {
  scope: McpPolicyScope;
  subjectUid: string;
  /**
   * Whether the textarea above differs from what is stored. The entries
   * below describe the *stored* list, and saying so is the difference
   * between a stale panel and a wrong one.
   */
  edited?: boolean;
}

const Row = ({ client }: { client: AdmittedClient }): JSX.Element => {
  const unreadable = client.kind === 'url' && client.resolved === false;
  const unusable = client.kind === 'unusable';
  const icon = unusable ? (
    <QuestionIcon />
  ) : unreadable ? (
    <AlertIcon />
  ) : client.kind === 'hostname' ? (
    <GlobeIcon />
  ) : (
    <CheckCircleIcon />
  );
  const tone = unusable || unreadable ? 'danger.fg' : 'fg.muted';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 2,
        alignItems: 'start',
        py: 2,
        borderTop: '1px solid',
        borderColor: 'border.muted',
      }}
    >
      <Box sx={{ color: tone, pt: '2px' }}>{icon}</Box>
      <Box sx={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {client.clientName && (
            <Text sx={{ fontWeight: 'semibold' }}>{client.clientName}</Text>
          )}
          {client.kind === 'hostname' && (
            <Label variant="accent" size="small">
              Whole host
            </Label>
          )}
          {client.localhostOnly && (
            // Worth a label of its own: every redirect goes to the reader's
            // own machine, and a document cannot prove which local program
            // is listening on the port.
            <Label variant="attention" size="small">
              Redirects to localhost
            </Label>
          )}
          {unreadable && (
            <Label variant="danger" size="small">
              Cannot be read
            </Label>
          )}
          {unusable && (
            <Label variant="danger" size="small">
              Matches nothing
            </Label>
          )}
        </Box>
        <Text
          sx={{
            fontSize: 0,
            fontFamily: 'mono',
            color: 'fg.muted',
            overflowWrap: 'anywhere',
          }}
        >
          {client.entry}
        </Text>
        {client.detail && (
          <Text sx={{ fontSize: 0, color: tone }}>{client.detail}</Text>
        )}
        {client.clientUri && (
          <Link
            href={client.clientUri}
            target="_blank"
            rel="noreferrer noopener"
            sx={{ fontSize: 0 }}
          >
            {client.clientHostname || client.clientUri}
          </Link>
        )}
      </Box>
    </Box>
  );
};

export const AdmittedClients = ({
  scope,
  subjectUid,
  edited = false,
}: AdmittedClientsProps): JSX.Element | null => {
  const described = useAdmittedClients(scope, subjectUid);

  if (described.isPending && !described.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <Spinner size="small" />
      </Box>
    );
  }

  // An error here is not worth a blankslate: the field above still works and
  // the policy is unaffected. Saying nothing would be worse than saying it
  // could not be checked, so it says that and stays out of the way.
  if (described.isError) {
    return (
      <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', m: 0 }}>
        The admitted clients could not be described just now. The list above is
        still what is enforced.
      </Text>
    );
  }

  const answer = described.data;
  if (!answer) {
    return null;
  }

  if (!answer.allowlisted) {
    // Said, not rendered as an empty list. An empty allowlist is not an
    // allowlist, and "no clients admitted" would be the opposite of what
    // the gateway does with a blank one.
    return (
      <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', m: 0 }}>
        {answer.detail ??
          'This layer names no client allowlist, so every client is admitted by it.'}
      </Text>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {edited && (
        <Text as="p" sx={{ fontSize: 0, color: 'attention.fg', m: 0 }}>
          Describing the <strong>saved</strong> list. Save to check what you
          have just typed.
        </Text>
      )}
      {answer.clients.map(client => (
        <Row key={client.entry} client={client} />
      ))}
    </Box>
  );
};

export default AdmittedClients;
