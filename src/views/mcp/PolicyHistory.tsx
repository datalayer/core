/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Who changed this policy, and when.
 *
 * The one question a policy page cannot answer from the policy itself: it
 * shows what is in force, and says nothing about how it got that way. An
 * administrator who finds a denylist they did not write has, without this,
 * nowhere to ask.
 *
 * The rows come from the audit — IAM records `mcp.policy.set` and
 * `mcp.policy.remove` with who, when, the scope, the subject and the
 * version. They are read with `?method=`, narrowed to the organization,
 * which is why that filter exists: without it these rows are reachable only
 * by reading past every tool call in the collection.
 *
 * **It can be empty for a real reason.** IAM's rows only reach the
 * collection where a deployment has configured the Solr audit sink; with the
 * default log sink they are in a log pipeline instead. An empty drawer that
 * implied "nobody has ever changed this" would be a lie in exactly the
 * deployment where somebody is trying to find out, so it says which of the
 * two it is.
 *
 * @module views/mcp/PolicyHistory
 */

import { useMemo } from 'react';
import { Label, RelativeTime, Spinner, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useAuditEvents } from '../../hooks/useMcp';
import type { McpAuditEvent } from '../../models/McpAuditEvent';

/** The methods IAM writes when a policy layer is written or removed. */
export const POLICY_AUDIT_METHODS = [
  'mcp.policy.set',
  'mcp.policy.remove',
] as const;

export interface PolicyHistoryProps {
  /** The organization whose audit this is read from. */
  orgUid: string;
  /**
   * The layer, when the drawer is about one.
   *
   * The audit is queried by organization and method — `subject_uid` lives in
   * `clientInfo` and is not a Solr field — so one layer's rows are picked
   * out of the answer here. That is honest for a handful of policy changes
   * and would not be for a busy tool-call listing.
   */
  subjectUid?: string;
  limit?: number;
}

/** What one row says about a change, in the words of the page it is on. */
export const describeChange = (event: McpAuditEvent): string => {
  const info = (event.clientInfo ?? {}) as Record<string, unknown>;
  const scope = String(info.scope ?? '');
  const rules = String(info.rules ?? '');
  if (event.method === 'mcp.policy.remove') {
    return `removed the ${scope || 'policy'} layer`;
  }
  if (rules && rules !== '(none)') {
    return `set ${rules.split(',').join(', ')}`;
  }
  // A layer written with no rules narrows nothing. Saying "set (none)" would
  // read as a failure; saying what it means is the point of the row.
  return 'set a layer that narrows nothing';
};

export const PolicyHistory = ({
  orgUid,
  subjectUid,
  limit = 20,
}: PolicyHistoryProps): JSX.Element => {
  // Both methods in one read: two queries would page independently and
  // interleave wrongly, showing a removal before the set that preceded it.
  const events = useAuditEvents(
    { org: orgUid, method: POLICY_AUDIT_METHODS[0], limit },
    { enabled: Boolean(orgUid) },
  );
  const removals = useAuditEvents(
    { org: orgUid, method: POLICY_AUDIT_METHODS[1], limit },
    { enabled: Boolean(orgUid) },
  );

  const rows = useMemo(() => {
    const all = [...(events.data?.items ?? []), ...(removals.data?.items ?? [])];
    const mine = subjectUid
      ? all.filter(
          event =>
            String((event.clientInfo as Record<string, unknown>)?.subject_uid ?? '') ===
            subjectUid,
        )
      : all;
    // Newest first, merged across the two reads.
    return mine
      .slice()
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      .slice(0, limit);
  }, [events.data, removals.data, subjectUid, limit]);

  if ((events.isPending || removals.isPending) && rows.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <Spinner size="small" />
      </Box>
    );
  }

  if (events.isError || removals.isError) {
    return (
      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
        The history could not be read. The policy above is unaffected.
      </Text>
    );
  }

  if (rows.length === 0) {
    return (
      <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', m: 0 }}>
        No recorded change. Either this layer has not been edited, or this
        deployment routes identity records to a log pipeline rather than to
        the audit — an administrator can tell you which.
      </Text>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {rows.map(event => (
        <Box
          key={event.uid}
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'baseline',
            flexWrap: 'wrap',
            fontSize: 0,
          }}
        >
          <Text sx={{ color: 'fg.muted', whiteSpace: 'nowrap' }}>
            <RelativeTime datetime={event.at} />
          </Text>
          <Text sx={{ fontWeight: 'semibold' }}>{event.userUid || 'unknown'}</Text>
          <Text>{describeChange(event)}</Text>
          {String(
            (event.clientInfo as Record<string, unknown>)?.version ?? '',
          ) && (
            <Label size="small" variant="secondary">
              v
              {String((event.clientInfo as Record<string, unknown>)?.version ?? '')}
            </Label>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default PolicyHistory;
