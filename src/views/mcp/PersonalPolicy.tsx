/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The rules a person sets for their own agents.
 *
 * The same six rules as an organization's layer, over the same
 * `PolicyForm` — but they mean something narrower here, and the difference
 * is the whole reason this page needs saying anything at all.
 *
 * **A personal layer only narrows.** Every layer intersects: the platform's
 * defaults, then the organization's, then the team's, then this. Denying a
 * tool here denies it. *Permitting* one an organization denies does nothing
 * — the denial unions across layers and cannot be lifted from below. A cap
 * of 60 under an organization's 30 leaves the effective cap at 30.
 *
 * So the page compares what is typed against the organizations the person
 * belongs to and says, **beside the field while their hands are on it**,
 * where a value will have no effect and why.
 *
 * It does not *refuse* those values, and that is deliberate. The same
 * personal layer applies to personal-scope work, where no organization
 * narrows anything — a rule that is wider than one employer's is still the
 * rule that governs an agent acting for the person alone. Refusing it would
 * make somebody's own policy unwritable because of a place they happen to
 * work.
 *
 * @module views/mcp/PersonalPolicy
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Flash, Heading, Spinner, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useDeleteMcpPolicyLayer,
  useMcpPolicyLayer,
  useSetMcpPolicyLayer,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import { McpPolicyConflict, type McpPolicyRules } from '../../api/iam/mcpPolicy';
import {
  EMPTY_POLICY_DRAFT,
  PolicyForm,
  draftOf,
  policyChanged,
  rulesFrom,
  type PolicyDraft,
} from './PolicyForm';
import type { McpErrorStateFn } from './types';

/** One organization the person belongs to, and what it narrows. */
export interface NarrowingOrganization {
  uid: string;
  name: string;
  rules: McpPolicyRules | null;
}

export interface PersonalPolicyProps {
  errorState: McpErrorStateFn;
  /** The person whose layer this is. */
  userUid: string;
  /**
   * The organizations they belong to, with each one's layer.
   *
   * Empty is the ordinary case for somebody with no organization, and the
   * page simply says nothing about narrowing.
   */
  organizations?: NarrowingOrganization[];
  showTitle?: boolean;
}

/** A list rule already denied elsewhere, as a sentence naming who. */
export const deniedElsewhere = (
  typed: string,
  organizations: NarrowingOrganization[],
): string[] => {
  const wanted = typed
    .split('\n')
    .map(entry => entry.trim())
    .filter(Boolean);
  const said: string[] = [];
  for (const organization of organizations) {
    const denied = (organization.rules?.toolDenylist ?? []).filter(tool =>
      wanted.includes(tool),
    );
    if (denied.length > 0) {
      said.push(`${organization.name} denies ${denied.join(', ')}`);
    }
  }
  return said;
};

/** A number rule already capped lower elsewhere. */
export const cappedLower = (
  typed: string,
  organizations: NarrowingOrganization[],
  rule: 'maxCallsPerMinute' | 'maxCreditsPerDay' | 'maxConcurrentSandboxes',
): string[] => {
  const value = Number(typed.trim());
  // The blank check is belt-and-braces rather than load-bearing: `Number('')`
  // is 0, and no positive organization cap is below 0, so a blank field says
  // nothing either way today. It is kept because that depends on the
  // `theirs > 0` guard below, and a reader changing one should not have to
  // notice it was holding up the other.
  if (!typed.trim() || !Number.isFinite(value)) {
    return [];
  }
  const said: string[] = [];
  for (const organization of organizations) {
    const theirs = organization.rules?.[rule];
    if (typeof theirs === 'number' && theirs > 0 && theirs < value) {
      said.push(`${organization.name} caps it at ${theirs}`);
    }
  }
  return said;
};

export const PersonalPolicy = ({
  errorState,
  userUid,
  organizations = [],
  showTitle = true,
}: PersonalPolicyProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const layer = useMcpPolicyLayer('personal', userUid);
  const save = useSetMcpPolicyLayer('personal', userUid);
  const remove = useDeleteMcpPolicyLayer('personal', userUid);

  const [draft, setDraft] = useState<PolicyDraft>(EMPTY_POLICY_DRAFT);
  const [conflict, setConflict] = useState('');
  const [refusal, setRefusal] = useState('');

  const stored = useMemo(() => draftOf(layer.data), [layer.data]);
  useEffect(() => setDraft(stored), [stored]);

  const changed = useMemo(() => policyChanged(draft, stored), [draft, stored]);

  const set = (key: keyof PolicyDraft, value: string) =>
    setDraft(current => ({ ...current, [key]: value }));

  /**
   * What to say beside each field, and nothing where there is nothing to
   * say. Recomputed as they type, because the point is to be read while
   * the value is still being chosen.
   */
  const notes = useMemo(() => {
    if (organizations.length === 0) {
      return {};
    }
    const built: Partial<Record<keyof PolicyDraft, React.ReactNode>> = {};

    const permitted = deniedElsewhere(draft.toolAllowlist, organizations);
    if (permitted.length > 0) {
      built.toolAllowlist = `Permitting a tool here does not lift a denial: ${permitted.join('; ')}. Your agents still cannot use those when acting for them.`;
    }

    for (const key of [
      'maxCallsPerMinute',
      'maxCreditsPerDay',
      'maxConcurrentSandboxes',
    ] as const) {
      const lower = cappedLower(draft[key], organizations, key);
      if (lower.length > 0) {
        built[key] = `Wider than an organization you belong to allows — ${lower.join('; ')}. When you act for them, theirs applies; this still governs your own work.`;
      }
    }
    return built;
  }, [draft, organizations]);

  const apply = () => {
    const rules = rulesFrom(draft);
    if (typeof rules === 'string') {
      setRefusal(rules);
      return;
    }
    setRefusal('');
    setConflict('');
    save.mutate(
      { rules, expectedVersion: layer.data?.version },
      {
        onSuccess: () =>
          enqueueToast('Saved. It applies to your next call.', { variant: 'success' }),
        onError: error => {
          if (error instanceof McpPolicyConflict) {
            setConflict(error.message);
            return;
          }
          enqueueToast(`Could not save: ${error.message}`, { variant: 'error' });
        },
      },
    );
  };

  if (layer.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(layer.error, 'Your MCP policy')}
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
            Your MCP policy
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            Rules for your own agents. These can only make things{' '}
            <strong>stricter</strong> — where you belong to an organization,
            its rules apply underneath and nothing here can loosen them.
          </Text>
        </Box>
      )}

      {conflict && (
        <Flash variant="warning">
          <Text sx={{ fontSize: 1 }}>{conflict}</Text>
          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => {
                setConflict('');
                layer.refetch();
              }}
            >
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

      <PolicyForm draft={draft} onChange={set} notes={notes} />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="primary" onClick={apply} disabled={!changed || save.isPending}>
          Save
        </Button>
        {changed && (
          <Button variant="invisible" onClick={() => setDraft(stored)}>
            Discard changes
          </Button>
        )}
        {layer.data && (
          <Box sx={{ marginLeft: 'auto' }}>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () =>
                    enqueueToast('Removed. You narrow nothing of your own.', {
                      variant: 'success',
                    }),
                  onError: error =>
                    enqueueToast(`Could not remove: ${error.message}`, {
                      variant: 'error',
                    }),
                })
              }
            >
              Remove my policy
            </Button>
          </Box>
        )}
      </Box>

      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Removing yours does not widen anything your organization set. It only
        stops your own rules from narrowing further.
      </Text>
    </Box>
  );
};

export default PersonalPolicy;
