/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The calls an agent cannot make without somebody saying yes.
 *
 * A source set to `explicit` stops every call it does not already hold an
 * approval for. The call waits as `pending-approval`, and the person who
 * owns the source is the only one who can move it — which means that until
 * this page existed, "approval required" was a setting that stopped agents
 * and gave nobody a way to unstop them.
 *
 * **An approval is bound to the arguments it was asked about.** Contents
 * hashes them and re-checks the hash when the call runs, so approving is
 * approving *those* arguments and not that tool in general. That is why the
 * redacted arguments are drawn in full rather than summarised: a reader who
 * cannot see what they are allowing is a reader who approves everything.
 *
 * **A pending approval that has expired is not decidable**, and the buttons
 * go rather than fail. Contents expires them lazily — the record still says
 * `pending` until something looks at it — so a row can arrive here already
 * over, and offering an Approve button on it would be offering a decision
 * the server will refuse.
 *
 * @module views/mcp/ApprovalQueue
 */

import type { JSX } from 'react';
import { useState } from 'react';
import {
  Button,
  Heading,
  Label,
  RelativeTime,
  SegmentedControl,
  Spinner,
  Text,
  Textarea,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useDecideMcpApproval,
  useMcpApprovals,
} from '../../hooks/useContents';
import type { McpApproval } from '../../api/contents/generated';
import { type McpErrorStateFn } from './types';

/** How each state of an approval is drawn. */
export const APPROVAL_LOOK: Record<
  McpApproval['status'],
  { label: string; variant: 'attention' | 'success' | 'danger' | 'secondary' }
> = {
  pending: { label: 'Waiting on you', variant: 'attention' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  expired: { label: 'Expired', variant: 'secondary' },
  consumed: { label: 'Used', variant: 'secondary' },
};

/**
 * Whether this approval can still be decided.
 *
 * Two conditions, and the second is the one that matters: the record says
 * `pending`, *and* its deadline has not passed. Contents expires an approval
 * when something next reads it rather than on a timer, so a row fetched a
 * minute ago can be `pending` and over. Trusting the status alone would draw
 * buttons whose only outcome is an error.
 *
 * An unparseable deadline is treated as passed. That is the safe direction:
 * the worst case is somebody has to ask the agent to try again, where the
 * other way round is a decision taken on a record nobody can date.
 */
export const isDecidable = (
  approval: Pick<McpApproval, 'status' | 'expiresAt'>,
  now: number = Date.now(),
): boolean => {
  if (approval.status !== 'pending') {
    return false;
  }
  const deadline = Date.parse(approval.expiresAt);
  return Number.isFinite(deadline) && deadline > now;
};

/**
 * What a row says about its own deadline.
 *
 * A pending approval that has run out is drawn as expired even though the
 * record still says pending — the reader's question is "can I still act on
 * this", and the record's answer to that is stale by construction.
 */
export const approvalLook = (
  approval: Pick<McpApproval, 'status' | 'expiresAt'>,
  now: number = Date.now(),
): { label: string; variant: 'attention' | 'success' | 'danger' | 'secondary' } =>
  approval.status === 'pending' && !isDecidable(approval, now)
    ? APPROVAL_LOOK.expired
    : APPROVAL_LOOK[approval.status];

/** The states this page can be filtered to. `pending` is what it opens on. */
export const APPROVAL_FILTERS: McpApproval['status'][] = [
  'pending',
  'approved',
  'rejected',
];

export interface ApprovalQueueProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Only the approvals of one source, when the caller has one in mind. */
  sourceUid?: string;
}

export const ApprovalQueue = ({
  errorState,
  sourceUid,
}: ApprovalQueueProps): JSX.Element => {
  const [status, setStatus] = useState<McpApproval['status']>('pending');
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});
  const approvals = useMcpApprovals(status, sourceUid ? { sourceUid } : {});
  const decide = useDecideMcpApproval();

  const items = approvals.data?.items ?? [];

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      <Box>
        <Heading as="h3" sx={{ fontSize: 2, mb: 1 }}>
          Approvals
        </Heading>
        <Text as="p" sx={{ fontSize: 1, color: 'fg.muted', m: 0 }}>
          A source set to require approval stops each call until you allow it.
          An approval covers the exact arguments below and nothing else, so a
          second call with different arguments asks again.
        </Text>
      </Box>

      <SegmentedControl aria-label="Which approvals" size="small">
        {APPROVAL_FILTERS.map(state => (
          <SegmentedControl.Button
            key={state}
            selected={status === state}
            onClick={() => setStatus(state)}
          >
            {APPROVAL_LOOK[state].label}
          </SegmentedControl.Button>
        ))}
      </SegmentedControl>

      {approvals.isError ? (
        <McpErrorBlankslate
          state={errorState(approvals.error, 'The approvals')}
          onRetry={() => approvals.refetch()}
        />
      ) : approvals.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : items.length === 0 ? (
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          {status === 'pending'
            ? 'Nothing is waiting on you.'
            : `No ${APPROVAL_LOOK[status].label.toLowerCase()} approvals.`}
        </Text>
      ) : (
        items.map(approval => {
          const look = approvalLook(approval);
          const decidable = isDecidable(approval);
          return (
            <Box
              key={approval.uid}
              sx={{
                border: '1px solid',
                borderColor: decidable ? 'attention.emphasis' : 'border.default',
                borderRadius: 2,
                p: 3,
                display: 'grid',
                gap: 2,
                minWidth: 0,
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Label size="small" variant={look.variant}>
                  {look.label}
                </Label>
                <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>
                  {approval.tool}
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted', fontFamily: 'mono' }}>
                  {approval.actorUid}
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  asked <RelativeTime datetime={approval.createdAt} />
                </Text>
                {decidable && (
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    expires <RelativeTime datetime={approval.expiresAt} />
                  </Text>
                )}
              </Box>

              {/* What is actually being allowed. Contents redacts the values
                  it holds as secret and hashes the whole; approving binds to
                  that hash, so this is the decision, not a summary of it. */}
              <Box
                as="pre"
                sx={{
                  fontFamily: 'mono',
                  fontSize: 0,
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto',
                  bg: 'canvas.subtle',
                  borderRadius: 2,
                  p: 2,
                  m: 0,
                }}
              >
                {JSON.stringify(approval.argumentsRedacted, null, 2)}
              </Box>

              {approval.destinationUri && (
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  Writes to{' '}
                  <Text as="span" sx={{ fontFamily: 'mono' }}>
                    {approval.destinationUri}
                  </Text>
                </Text>
              )}

              {decidable ? (
                <>
                  <Textarea
                    aria-label={`Why, for ${approval.tool}`}
                    rows={2}
                    placeholder="Why (optional; kept with the decision)"
                    value={noteFor[approval.uid] ?? ''}
                    onChange={event =>
                      setNoteFor(current => ({
                        ...current,
                        [approval.uid]: event.target.value,
                      }))
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="primary"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          approvalUid: approval.uid,
                          decision: 'approve',
                          note: noteFor[approval.uid] || undefined,
                        })
                      }
                    >
                      Allow this call
                    </Button>
                    <Button
                      variant="danger"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          approvalUid: approval.uid,
                          decision: 'reject',
                          note: noteFor[approval.uid] || undefined,
                        })
                      }
                    >
                      Refuse
                    </Button>
                  </Box>
                </>
              ) : (
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  {approval.decidedBy
                    ? `Decided by ${approval.decidedBy}`
                    : 'This request ran out before anybody decided it. The agent has to ask again.'}
                  {approval.note ? ` — ${approval.note}` : ''}
                </Text>
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default ApprovalQueue;
