/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What each team narrows, on top of the organization's own layer.
 *
 * A team is a scope, not a label: its layer sits between the
 * organization's and the person's, and everything intersects. A team can be
 * stricter than its organization and never looser — permitting a tool the
 * organization denies does nothing, and a cap above the organization's
 * leaves the organization's in force.
 *
 * The one rule that behaves differently is worth saying on this page rather
 * than leaving to be discovered: **a team's sandbox limit counts the team's
 * own sandboxes**, not the organization's. Every other rule is one number
 * checked once; a counted quota belongs to a scope, and a team cap measured
 * against the organization's count would refuse a team running nothing
 * because other teams are busy.
 *
 * Team owners administer their own slice — no new role, the existing
 * `team_owner` handle carries it — and an organization owner may write any
 * of them, since an owner who could not narrow one of their own teams would
 * have to remove the team to do it.
 *
 * @module views/mcp/TeamPolicies
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Flash, Heading, Select, Spinner, Text } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { PeopleIcon } from '@primer/octicons-react';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useMcpPolicyLayer,
  useOrganizationTeams,
  useSetMcpPolicyLayer,
  useDeleteMcpPolicyLayer,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import { McpPolicyConflict } from '../../api/iam/mcpPolicy';
import { PolicyHistory } from './PolicyHistory';
import {
  EMPTY_POLICY_DRAFT,
  PolicyForm,
  draftOf,
  policyChanged,
  rulesFrom,
  type PolicyDraft,
} from './PolicyForm';
import type { McpErrorStateFn } from './types';

export interface TeamPoliciesProps {
  errorState: McpErrorStateFn;
  orgUid: string;
  readOnly?: boolean;
  showTitle?: boolean;
}

/**
 * The form for one team.
 *
 * Its own component so that choosing a different team unmounts it: a form
 * that kept its draft across a change of team would offer to save one
 * team's rules onto another, which is the one mistake on this page nobody
 * would notice until it had happened.
 */
const TeamPolicyForm = ({
  orgUid,
  teamUid,
  teamName,
  readOnly,
}: {
  orgUid: string;
  teamUid: string;
  teamName: string;
  readOnly: boolean;
}): JSX.Element => {
  const { enqueueToast } = useToast();
  const layer = useMcpPolicyLayer('team', teamUid);
  const save = useSetMcpPolicyLayer('team', teamUid);
  const remove = useDeleteMcpPolicyLayer('team', teamUid);

  const [draft, setDraft] = useState<PolicyDraft>(EMPTY_POLICY_DRAFT);
  const [conflict, setConflict] = useState('');
  const [refusal, setRefusal] = useState('');

  const stored = useMemo(() => draftOf(layer.data), [layer.data]);
  useEffect(() => setDraft(stored), [stored]);
  const changed = useMemo(() => policyChanged(draft, stored), [draft, stored]);

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
      { rules, expectedVersion: layer.data?.version },
      {
        onSuccess: () =>
          enqueueToast(`${teamName}'s policy saved.`, { variant: 'success' }),
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

  if (layer.isPending && layer.data === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
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

      <PolicyForm
        draft={draft}
        onChange={set}
        disabled={readOnly}
        notes={{
          maxConcurrentSandboxes:
            "Counted over this team's own sandboxes, not the organization's " +
            '— so another team being busy never uses up this limit. The ' +
            "organization's cap still applies on top.",
        }}
      />

      {!readOnly && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={apply}
            disabled={!changed || save.isPending}
          >
            Save {teamName}&rsquo;s policy
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
                      enqueueToast(`${teamName} narrows nothing of its own.`, {
                        variant: 'success',
                      }),
                    onError: error =>
                      enqueueToast(`Could not remove: ${error.message}`, {
                        variant: 'error',
                      }),
                  })
                }
              >
                Remove
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.muted',
          pt: 3,
          display: 'grid',
          gap: 2,
        }}
      >
        <Text as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', m: 0 }}>
          History
        </Text>
        <PolicyHistory orgUid={orgUid} subjectUid={teamUid} />
      </Box>

      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        A team can be stricter than its organization and never looser.
        Permitting a tool the organization denies does nothing, and a cap above
        the organization&rsquo;s leaves the organization&rsquo;s in force.
      </Text>
    </Box>
  );
};

export const TeamPolicies = ({
  errorState,
  orgUid,
  readOnly = false,
  showTitle = true,
}: TeamPoliciesProps): JSX.Element => {
  const teams = useOrganizationTeams(orgUid);
  const [chosen, setChosen] = useState('');

  const current = useMemo(
    () => (teams.data ?? []).find(team => team.uid === chosen) ?? (teams.data ?? [])[0],
    [teams.data, chosen],
  );

  if (teams.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(teams.error, "The organization's teams")}
        onRetry={() => teams.refetch()}
      />
    );
  }

  if (teams.isPending && !teams.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <Spinner />
      </Box>
    );
  }

  if ((teams.data ?? []).length === 0) {
    return (
      <Blankslate border spacious>
        <Blankslate.Visual>
          <PeopleIcon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>No teams</Blankslate.Heading>
        <Blankslate.Description>
          <Text sx={{ textAlign: 'center' }}>
            A team is a scope, not a label: it gets its own rules, its own
            sandbox limit and its own alerts. Create one in the
            organization&rsquo;s settings and it appears here.
          </Text>
        </Blankslate.Description>
      </Blankslate>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0, maxWidth: '52rem' }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            Team policies
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            What each team narrows, on top of this organization&rsquo;s own
            rules. A team owner may write their own team&rsquo;s.
          </Text>
        </Box>
      )}

      <Box sx={{ maxWidth: '20rem' }}>
        <Select
          value={current?.uid ?? ''}
          onChange={event => setChosen(event.target.value)}
          aria-label="Team"
        >
          {(teams.data ?? []).map(team => (
            <Select.Option key={team.uid} value={team.uid}>
              {team.name}
            </Select.Option>
          ))}
        </Select>
      </Box>

      {current && (
        // Keyed by the team, so choosing another unmounts the form rather
        // than carrying one team's unsaved draft onto the next.
        <TeamPolicyForm
          key={current.uid}
          orgUid={orgUid}
          teamUid={current.uid}
          teamName={current.name}
          readOnly={readOnly}
        />
      )}
    </Box>
  );
};

export default TeamPolicies;
