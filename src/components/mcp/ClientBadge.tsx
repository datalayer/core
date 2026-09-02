/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which client this is, said the way its identity was established.
 *
 * A client that registered by Client ID Metadata Document *is* its URL: the
 * host is the part of its identity nobody can invent, and it is what the
 * consent screen showed — so the URL is the client id on screen, with the
 * hostname read out beneath the name. A client registered through the
 * deprecated dynamic path has an opaque id and gets it plainly, marked as
 * such, because the two are not the same kind of fact.
 *
 * The badge explains itself through `title` and its accessible name rather
 * than a Primer `Tooltip`. That component requires an interactive child and
 * warns otherwise, because a tooltip on a label appears on hover and nowhere
 * else — it does not exist for a keyboard or a screen reader. A `<button>`
 * around the word would silence the warning by trading one problem for
 * another: a tab stop that announces itself as a button and does nothing.
 *
 * The word alone is the part that needs explaining. "Document" read out on
 * its own says nothing, so the accessible name is the whole sentence.
 *
 * @module components/mcp/ClientBadge
 */

import type { JSX } from 'react';
import { Label, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { isCimdClientId } from '../../api/iam/connectedAgents';
import type { ConnectedAgentRegistration } from '../../api/iam/connectedAgents';

export interface ClientBadgeProps {
  clientId: string;
  clientName?: string | null;
  /**
   * How the client registered, when IAM said. Without it the id's shape is
   * used, which is what an audit row or a task leaves us with.
   */
  registration?: ConnectedAgentRegistration;
  /** The document's hostname, when IAM answered one. */
  clientHostname?: string | null;
  /** Without the second line, for a dense table. */
  compact?: boolean;
}

/** The hostname of a document URL, or an empty string for anything else. */
export const clientHostnameOf = (clientId: string): string => {
  try {
    return new URL(clientId).hostname;
  } catch {
    return '';
  }
};

export const ClientBadge = ({
  clientId,
  clientName,
  registration,
  clientHostname,
  compact = false,
}: ClientBadgeProps): JSX.Element => {
  const byDocument =
    (registration ?? (isCimdClientId(clientId) ? 'cimd' : 'dcr')) === 'cimd';
  const hostname =
    clientHostname || (byDocument ? clientHostnameOf(clientId) : '');
  const name =
    clientName || (byDocument ? hostname : '') || clientId || 'Unknown client';
  return (
    <Box sx={{ display: 'grid', gap: '2px', minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
        <Text
          sx={{
            fontSize: 1,
            fontWeight: 'semibold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Text>
        {byDocument ? (
          <Label
            size="small"
            variant="accent"
            title="Registered by Client ID Metadata Document"
            aria-label="Registered by Client ID Metadata Document"
          >
            Document
          </Label>
        ) : (
          <Label
            size="small"
            variant="secondary"
            title="Registered dynamically; its id is opaque"
            aria-label="Registered dynamically; its id is opaque"
          >
            Dynamic
          </Label>
        )}
      </Box>
      {!compact && clientId && (
        <Text
          sx={{
            fontSize: 0,
            color: 'fg.muted',
            fontFamily: 'mono',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={clientId}
        >
          {clientId}
        </Text>
      )}
    </Box>
  );
};

export default ClientBadge;
