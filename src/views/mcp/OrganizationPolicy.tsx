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
import {
  Button,
  Flash,
  FormControl,
  Heading,
  Spinner,
  Text,
  TextInput,
  Textarea,
} from '@primer/react';
import { Dialog } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useDeleteMcpPolicyLayer,
  useMcpPolicyLayer,
  useSetMcpPolicyLayer,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import {
  McpPolicyConflict,
  type McpPolicyRules,
} from '../../api/iam/mcpPolicy';
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

/** The form's own shape: every field a string, as a text input holds it. */
type Draft = {
  toolDenylist: string;
  toolAllowlist: string;
  allowedClients: string;
  maxCallsPerMinute: string;
  maxCreditsPerDay: string;
  maxConcurrentSandboxes: string;
};

const EMPTY: Draft = {
  toolDenylist: '',
  toolAllowlist: '',
  allowedClients: '',
  maxCallsPerMinute: '',
  maxCreditsPerDay: '',
  maxConcurrentSandboxes: '',
};

/** A stored list as the textarea shows it: one entry a line. */
const linesOf = (value: string[] | undefined): string =>
  (value ?? []).join('\n');

/**
 * A textarea back to a list, or `undefined` where nothing was typed.
 *
 * `undefined`, never `[]`. An empty array is a rule *set* to nothing, and
 * for an allowlist that is the difference between "I have not set one" and
 * a setting that refuses everything.
 */
const listFrom = (value: string): string[] | undefined => {
  const entries = value
    .split('\n')
    .map(entry => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : undefined;
};

/** A number field back to a number, or `undefined` where it was left blank. */
const numberFrom = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const textOf = (value: number | undefined): string =>
  value === undefined || value === null ? '' : String(value);

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

  const [draft, setDraft] = useState<Draft>(EMPTY);
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

  const stored = useMemo<Draft>(
    () => ({
      toolDenylist: linesOf(layer.data?.toolDenylist),
      toolAllowlist: linesOf(layer.data?.toolAllowlist),
      allowedClients: linesOf(layer.data?.allowedClients),
      maxCallsPerMinute: textOf(layer.data?.maxCallsPerMinute),
      maxCreditsPerDay: textOf(layer.data?.maxCreditsPerDay),
      maxConcurrentSandboxes: textOf(layer.data?.maxConcurrentSandboxes),
    }),
    [layer.data],
  );

  // The form follows what was read, including after a conflict has been
  // resolved by re-reading: an editor still showing the losing draft is how
  // somebody reapplies the change that was already refused.
  useEffect(() => setDraft(stored), [stored]);

  const changed = useMemo(
    () => (Object.keys(EMPTY) as (keyof Draft)[]).some(key => draft[key] !== stored[key]),
    [draft, stored],
  );

  const set = (key: keyof Draft, value: string) =>
    setDraft(current => ({ ...current, [key]: value }));

  /**
   * The rules as they will be stored, or the reason they will not be.
   *
   * A cap of zero is caught *here* rather than at the write, because IAM's
   * refusal is correct and unhelpful: somebody who typed 0 meant "stop my
   * agents", and the answer they need is what to do instead.
   */
  const rulesOrRefusal = (): McpPolicyRules | string => {
    const numbers: [keyof Draft, string][] = [
      ['maxCallsPerMinute', 'Calls per minute'],
      ['maxCreditsPerDay', 'Credits per day'],
      ['maxConcurrentSandboxes', 'Sandboxes at once'],
    ];
    for (const [key, label] of numbers) {
      const typed = draft[key].trim();
      if (!typed) {
        continue;
      }
      const parsed = Number(typed);
      if (!Number.isFinite(parsed)) {
        return `${label} must be a number, or empty for no limit.`;
      }
      if (parsed <= 0) {
        return (
          `${label} cannot be 0. A non-positive limit reads as *no limit*, ` +
          'so a zero written to stop your agents would lift the limit ' +
          'instead. To stop an agent, revoke its grant or deny the tools it ' +
          'uses.'
        );
      }
    }
    return {
      toolDenylist: listFrom(draft.toolDenylist),
      toolAllowlist: listFrom(draft.toolAllowlist),
      allowedClients: listFrom(draft.allowedClients),
      maxCallsPerMinute: numberFrom(draft.maxCallsPerMinute),
      maxCreditsPerDay: numberFrom(draft.maxCreditsPerDay),
      maxConcurrentSandboxes: numberFrom(draft.maxConcurrentSandboxes),
    };
  };

  const apply = () => {
    const rules = rulesOrRefusal();
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

      <FormControl>
        <FormControl.Label>Denied tools</FormControl.Label>
        <Textarea
          block
          rows={3}
          disabled={readOnly}
          value={draft.toolDenylist}
          onChange={event => set('toolDenylist', event.target.value)}
          placeholder={'execute_cell\ndelete_file'}
        />
        <FormControl.Caption>
          One a line. A denial is added to every other layer&rsquo;s and can
          never be lifted by one — a team cannot re-permit what you deny here.
        </FormControl.Caption>
      </FormControl>

      <FormControl>
        <FormControl.Label>Permitted tools</FormControl.Label>
        <Textarea
          block
          rows={3}
          disabled={readOnly}
          value={draft.toolAllowlist}
          onChange={event => set('toolAllowlist', event.target.value)}
          placeholder={'read_cell\nlist_notebooks'}
        />
        <FormControl.Caption>
          One a line, and everything else is refused. <strong>Leave it empty
          to set no allowlist</strong> — empty means &ldquo;I have not set
          one&rdquo;, not &ldquo;nothing is permitted&rdquo;, because the
          second would stop every agent in the organization at once.
        </FormControl.Caption>
      </FormControl>

      <FormControl>
        <FormControl.Label>Admitted clients</FormControl.Label>
        <Textarea
          block
          rows={3}
          disabled={readOnly}
          value={draft.allowedClients}
          onChange={event => set('allowedClients', event.target.value)}
          placeholder={'https://claude.ai/.well-known/mcp-client.json\ncursor.com'}
        />
        <FormControl.Caption>
          A client&rsquo;s document URL, or just its hostname. Empty is not an
          allowlist, for the same reason as above.
        </FormControl.Caption>
      </FormControl>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: ['1fr', '1fr 1fr 1fr'] }}>
        <FormControl>
          <FormControl.Label>Calls per minute</FormControl.Label>
          <TextInput
            block
            type="number"
            min={1}
            disabled={readOnly}
            value={draft.maxCallsPerMinute}
            onChange={event => set('maxCallsPerMinute', event.target.value)}
          />
          <FormControl.Caption>Empty for no limit.</FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Credits per day</FormControl.Label>
          <TextInput
            block
            type="number"
            min={1}
            disabled={readOnly}
            value={draft.maxCreditsPerDay}
            onChange={event => set('maxCreditsPerDay', event.target.value)}
          />
          <FormControl.Caption>
            Checked before a launch, never mid-session.
          </FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Sandboxes at once</FormControl.Label>
          <TextInput
            block
            type="number"
            min={1}
            disabled={readOnly}
            value={draft.maxConcurrentSandboxes}
            onChange={event => set('maxConcurrentSandboxes', event.target.value)}
          />
          <FormControl.Caption>
            Counted across the organization. A team&rsquo;s own limit counts
            only that team&rsquo;s.
          </FormControl.Caption>
        </FormControl>
      </Box>

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
