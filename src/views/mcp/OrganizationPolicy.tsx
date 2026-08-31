/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an organization narrows for its agents, and the form that writes it.
 *
 * The sibling `Policies` view is the *read*: every layer intersected, with
 * the layer that decided each rule. This is the *write*, and only one
 * layer's — an organization owner cannot edit the platform's defaults or
 * somebody's personal rules, and would not want to.
 *
 * Three things this page owes the person filling it in:
 *
 * **Only rules the gateway enforces.** IAM refuses anything else, so a form
 * offering more would collect a setting that is thrown away at the write —
 * and `toolDenyList` would read as a working denylist rather than a typo.
 * The fields come from `MCP_POLICY_RULES` so the form cannot drift.
 *
 * **An empty allowlist is not an allowlist.** Leaving the field blank means
 * "I have not set one", not "nothing is permitted" — the second would stop
 * every agent in the organization, and the first conclusion anybody draws
 * from that is that the platform is down. The captions say so where
 * somebody is about to make that mistake.
 *
 * **A limit of zero is refused rather than stored.** The gateway reads a
 * non-positive cap as *no cap*, so a zero written to stop an organization's
 * agents lifts its limit instead — the one value whose stored meaning is the
 * opposite of its plain reading.
 *
 * @module views/mcp/OrganizationPolicy
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Flash, Heading, Spinner, Text } from '@primer/react';
import { Dialog } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useDeleteMcpPolicyLayer,
  useMcpPolicyLayer,
  useSetMcpPolicyLayer,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import { McpPolicyConflict } from '../../api/iam/mcpPolicy';
import {
  EMPTY_POLICY_DRAFT,
  PolicyForm,
  draftOf,
  policyChanged,
  rulesFrom,
  type PolicyDraft,
} from './PolicyForm';
import type { McpErrorStateFn } from './types';

export interface OrganizationPolicyProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** The organization whose layer this is. */
  orgUid: string;
  /**
   * Read-only for anybody who is not an owner. IAM refuses their writes
   * either way; this keeps the page from offering an action that would be
   * refused.
   */
  readOnly?: boolean;
  showTitle?: boolean;
}

export const OrganizationPolicy = ({
  errorState,
  orgUid,
  readOnly = false,
  showTitle = true,
}: OrganizationPolicyProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const layer = useMcpPolicyLayer('organization', orgUid);
  const save = useSetMcpPolicyLayer('organization', orgUid);
  const remove = useDeleteMcpPolicyLayer('organization', orgUid);

  const [draft, setDraft] = useState<PolicyDraft>(EMPTY_POLICY_DRAFT);
  const [removing, setRemoving] = useState(false);
  const [conflict, setConflict] = useState('');
  const [refusal, setRefusal] = useState('');

  /**
   * The version that was read, sent back with the write.
   *
   * `undefined` when nobody has written this layer: inventing a version
   * would make the first write of every policy a conflict.
   */
  const version = layer.data?.version;

  const stored = useMemo(() => draftOf(layer.data), [layer.data]);

  // The form follows what was read, including after a conflict has been
  // resolved by re-reading: an editor still showing the losing draft is how
  // somebody reapplies the change that was already refused.
  useEffect(() => setDraft(stored), [stored]);

  const changed = useMemo(
    () => policyChanged(draft, stored),
    [draft, stored],
  );

  const set = (key: keyof PolicyDraft, value: string) =>
    setDraft(current => ({ ...current, [key]: value }));

  const apply = () => {
    const rules = rulesFrom(draft);
    if (typeof rules === 'string') {
      setRefusal(rules);
      return;
    }
    setRefusal('');
    setConflict('');
    save.mutate(
      { rules, expectedVersion: version },
      {
        onSuccess: () => {
          enqueueToast('Policy saved. It applies to the next call.', {
            variant: 'success',
          });
        },
        onError: error => {
          if (error instanceof McpPolicyConflict) {
            // Not a toast. A toast disappears, and this needs an action —
            // the draft in front of them is the one that lost.
            setConflict(error.message);
            return;
          }
          enqueueToast(`Could not save: ${error.message}`, { variant: 'error' });
        },
      },
    );
  };

  const confirmRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        setRemoving(false);
        enqueueToast('Policy removed. This layer narrows nothing.', {
          variant: 'success',
        });
      },
      onError: error => {
        setRemoving(false);
        enqueueToast(`Could not remove: ${error.message}`, { variant: 'error' });
      },
    });
  };

  if (layer.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(layer.error, "The organization's MCP policy")}
        onRetry={() => layer.refetch()}
      />
    );
  }

  if (layer.isPending && layer.data === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0, maxWidth: '52rem' }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            Organization Policy
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            What this organization narrows for every agent acting in it. Each
            layer only narrows — a team, or a person, can be stricter than
            this and never looser.
          </Text>
        </Box>
      )}

      {conflict && (
        <Flash variant="warning">
          <Text sx={{ fontSize: 1 }}>{conflict}</Text>
          <Box sx={{ mt: 2 }}>
            <Button size="small" onClick={() => { setConflict(''); layer.refetch(); }}>
              Read it again
            </Button>
          </Box>
        </Flash>
      )}

      {refusal && (
        <Flash variant="danger">
          <Text sx={{ fontSize: 1 }}>{refusal}</Text>
        </Flash>
      )}

      <PolicyForm draft={draft} onChange={set} disabled={readOnly} />

      {!readOnly && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={apply}
            disabled={!changed || save.isPending}
          >
            Save policy
          </Button>
          {changed && (
            <Button variant="invisible" onClick={() => setDraft(stored)}>
              Discard changes
            </Button>
          )}
          {layer.data && (
            <Box sx={{ marginLeft: 'auto' }}>
              <Button variant="danger" onClick={() => setRemoving(true)}>
                Remove policy
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Only these rules can be stored. A rule the gateway does not enforce is
        refused rather than kept, so this page cannot promise something that
        never happens.
      </Text>

      {removing && (
        <Dialog
          title="Remove this policy?"
          onClose={() => setRemoving(false)}
          footerButtons={[
            { buttonType: 'default', content: 'Keep it', onClick: () => setRemoving(false) },
            {
              buttonType: 'danger',
              content: 'Remove',
              onClick: confirmRemove,
              disabled: remove.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            This organization stops narrowing anything. Its agents fall back to
            the platform defaults and to whatever each team and person has set
            — which may be <strong>wider</strong> than what you have now.
            Nothing already done is undone.
          </Text>
        </Dialog>
      )}
    </Box>
  );
};

export default OrganizationPolicy;
