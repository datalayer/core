/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The organization's service agents: principals rather than proxies.
 *
 * The Agents page next door lists *grants* — somebody's authority narrowed
 * to one client, dying with their account. This page lists the other kind:
 * an agent that belongs to the organization, holds its own key, spends
 * under its own name and outlives whoever set it up. An organization whose
 * nightly pipeline runs on an engineer's grant loses the pipeline when the
 * engineer leaves, and its spend shows against somebody who was asleep.
 *
 * Three things this page has to get right, all of them about the key:
 *
 * **It is shown once**, in the dialog that creates or rotates it, and the
 * dialog says so before it says anything else. IAM stores a hash and cannot
 * show it again, so somebody who does not read that sentence stores nothing
 * and rotates an hour later.
 *
 * **Rotating breaks the old key immediately.** There is no grace period, by
 * design, so the confirmation says what will stop rather than asking a
 * yes/no about a word.
 *
 * **Revoking does not remove the row.** Its audit rows name it, and a uid
 * that resolves to nothing makes a year-old row unreadable. Revoked is a
 * state in the table, never a reason to hide it.
 *
 * @module views/mcp/ServiceAgents
 */

import { useMemo, useRef, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Checkbox,
  FormControl,
  Heading,
  Label,
  RelativeTime,
  Spinner,
  Text,
  TextInput,
} from '@primer/react';
import {
  Blankslate,
  DataTable,
  Dialog,
  Table,
} from '@primer/react/experimental';
import type { DataTableProps } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { KebabHorizontalIcon, KeyIcon } from '@primer/octicons-react';
import { McpErrorBlankslate, ScopeList } from '../../components/mcp';
import {
  useCreateServiceAgent,
  useRevokeServiceAgent,
  useRotateServiceAgentKey,
  useServiceAgents,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import {
  SERVICE_AGENT_SCOPES,
  type ServiceAgent,
} from '../../api/iam/serviceAgents';
import type { McpErrorStateFn } from './types';

export interface ServiceAgentsProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** The organization whose agents these are. */
  orgUid: string;
  /**
   * Read-only for anybody who is not an owner. Members may *see* the list —
   * an agent spending their organization's budget is one they will ask
   * about — and IAM refuses their writes either way; this only keeps the
   * page from offering an action that would be refused.
   */
  readOnly?: boolean;
  /** Drawn without its heading, when the page around it carries one. */
  showTitle?: boolean;
}

type AgentRow = ServiceAgent & { id: string };

/** What the key dialog is showing, and why. */
type KeyShown = { agent: string; key: string; rotated: boolean };

export const ServiceAgents = ({
  errorState,
  orgUid,
  readOnly = false,
  showTitle = true,
}: ServiceAgentsProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const agents = useServiceAgents(orgUid);
  const create = useCreateServiceAgent(orgUid);
  const rotate = useRotateServiceAgentKey(orgUid);
  const revoke = useRevokeServiceAgent(orgUid);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['runtimes:read']);
  const [rotating, setRotating] = useState<AgentRow | null>(null);
  const [revoking, setRevoking] = useState<AgentRow | null>(null);
  const [keyShown, setKeyShown] = useState<KeyShown | null>(null);
  // Primer 37 types Dialog's focus refs with React 18's non-nullable
  // `RefObject<HTMLElement>`. React 19's `useRef(null)` is nullable, and this
  // ref is only handed to Dialog, so narrow it once here.
  const returnFocusRef = useRef<HTMLElement>(
    null,
  ) as React.RefObject<HTMLElement>;

  const rows = useMemo<AgentRow[]>(
    () => (agents.data ?? []).map(agent => ({ ...agent, id: agent.uid })),
    [agents.data],
  );

  const closeCreate = () => {
    setCreating(false);
    setName('');
    setScopes(['runtimes:read']);
  };

  const confirmCreate = () => {
    create.mutate(
      { name: name.trim(), scopes },
      {
        onSuccess: agent => {
          closeCreate();
          setKeyShown({
            agent: agent.name || agent.uid,
            key: agent.key,
            rotated: false,
          });
        },
        onError: reason => {
          enqueueToast(`Could not create the agent: ${reason.message}`, {
            variant: 'error',
          });
        },
      },
    );
  };

  const confirmRotate = () => {
    const agent = rotating;
    if (!agent) {
      return;
    }
    rotate.mutate(agent.uid, {
      onSuccess: rotated => {
        setRotating(null);
        setKeyShown({
          agent: agent.name || agent.uid,
          key: rotated.key,
          rotated: true,
        });
      },
      onError: reason => {
        enqueueToast(`Could not rotate the key: ${reason.message}`, {
          variant: 'error',
        });
        setRotating(null);
      },
    });
  };

  const confirmRevoke = () => {
    const agent = revoking;
    if (!agent) {
      return;
    }
    revoke.mutate(agent.uid, {
      onSuccess: () => {
        enqueueToast(`${agent.name || agent.uid} is revoked.`, {
          variant: 'success',
        });
        setRevoking(null);
      },
      onError: reason => {
        enqueueToast(`Could not revoke: ${reason.message}`, {
          variant: 'error',
        });
        setRevoking(null);
      },
    });
  };

  const toggleScope = (scope: string, on: boolean) =>
    setScopes(current =>
      on
        ? [...current, scope]
        : current.filter(candidate => candidate !== scope),
    );

  const columns: DataTableProps<AgentRow>['columns'] = [
    {
      header: 'Agent',
      field: 'name',
      rowHeader: true,
      renderCell: row => (
        <Box sx={{ display: 'grid' }}>
          <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>
            {row.name || row.uid}
          </Text>
          {row.description && (
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              {row.description}
            </Text>
          )}
        </Box>
      ),
    },
    {
      header: 'Kind',
      id: 'kind',
      width: '110px',
      renderCell: () => (
        <Label size="small" variant="accent">
          Service
        </Label>
      ),
    },
    {
      header: 'Allowed to',
      id: 'scopes',
      width: 'growCollapse',
      renderCell: row => (
        <ScopeList scopes={row.scopes.split(' ').filter(Boolean)} />
      ),
    },
    {
      header: 'State',
      id: 'state',
      width: '110px',
      renderCell: row =>
        row.revoked ? (
          <Label size="small" variant="danger">
            Revoked
          </Label>
        ) : (
          <Label size="small" variant="success">
            Active
          </Label>
        ),
    },
    {
      header: 'Key rotated',
      id: 'rotated',
      width: '130px',
      renderCell: row =>
        row.keyRotatedAt ? (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            <RelativeTime datetime={row.keyRotatedAt} />
          </Text>
        ) : (
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>—</Text>
        ),
    },
    {
      header: '',
      id: 'actions',
      width: '48px',
      align: 'end',
      renderCell: row =>
        readOnly || row.revoked ? (
          <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>—</Text>
        ) : (
          <ActionMenu>
            <ActionMenu.Anchor>
              <Button
                variant="invisible"
                size="small"
                aria-label={`Actions for ${row.name || row.uid}`}
                icon={KebabHorizontalIcon}
              />
            </ActionMenu.Anchor>
            <ActionMenu.Overlay align="end">
              <ActionList>
                <ActionList.Item onSelect={() => setRotating(row)}>
                  Rotate key
                </ActionList.Item>
                <ActionList.Item
                  variant="danger"
                  onSelect={() => setRevoking(row)}
                >
                  Revoke
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        ),
    },
  ];

  if (agents.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(agents.error, 'Service agents')}
        onRetry={() => agents.refetch()}
      />
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      {showTitle && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'start',
            justifyContent: 'space-between',
            gap: 3,
          }}
        >
          <Box>
            <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
              Service Agents
            </Heading>
            <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
              Agents that belong to this organization rather than to a person: a
              pipeline, a CI job, a bot. Each holds its own key and spends under
              its own name.
            </Text>
          </Box>
          {!readOnly && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              New service agent
            </Button>
          )}
        </Box>
      )}

      {agents.isPending && !agents.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : rows.length > 0 ? (
        <Table.Container>
          <Table.Title as="h3" id="service-agents">
            Service agents
          </Table.Title>
          <Table.Subtitle as="p" id="service-agents-subtitle">
            A revoked agent stays listed: its audit rows name it, and a uid that
            resolves to nothing makes them unreadable a year from now.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="service-agents"
            aria-describedby="service-agents-subtitle"
            data={rows}
            columns={columns}
          />
        </Table.Container>
      ) : (
        <Blankslate border spacious>
          <Blankslate.Visual>
            <KeyIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>No service agent</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>
              An agent that runs on somebody&rsquo;s grant stops when that
              person leaves, and its spend shows against them. A service agent
              is the organization&rsquo;s own.
            </Text>
          </Blankslate.Description>
          {!readOnly && (
            <Button size="small" onClick={() => setCreating(true)}>
              New service agent
            </Button>
          )}
        </Blankslate>
      )}

      {creating && (
        <Dialog
          title="New service agent"
          onClose={closeCreate}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            { buttonType: 'default', content: 'Cancel', onClick: closeCreate },
            {
              buttonType: 'primary',
              content: 'Create',
              onClick: confirmCreate,
              // Both are refused by IAM anyway — a nameless agent is
              // unreadable in an audit row, and a scopeless one is a key
              // that fails at its first call. Disabling here turns a refusal
              // into an obvious gap in the form.
              disabled: create.isPending || !name.trim() || scopes.length === 0,
            },
          ]}
        >
          <Box sx={{ display: 'grid', gap: 3 }}>
            <FormControl required>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput
                block
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="nightly ingest"
              />
              <FormControl.Caption>
                What somebody reading an audit row or a spend line a year from
                now has to go on.
              </FormControl.Caption>
            </FormControl>

            <Box>
              <Text as="p" sx={{ fontSize: 1, fontWeight: 'semibold', mb: 1 }}>
                Allowed to
              </Text>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {SERVICE_AGENT_SCOPES.map(scope => (
                  <FormControl key={scope}>
                    <Checkbox
                      checked={scopes.includes(scope)}
                      onChange={event =>
                        toggleScope(scope, event.target.checked)
                      }
                    />
                    <FormControl.Label>{scope}</FormControl.Label>
                  </FormControl>
                ))}
              </Box>
              <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', mt: 1 }}>
                The scopes about a person — their profile, acting as them — are
                not here: a pipeline is not a person, and granting one to it
                would do nothing while looking like it did something.
              </Text>
            </Box>
          </Box>
        </Dialog>
      )}

      {keyShown && (
        <Dialog
          title={keyShown.rotated ? 'The new key' : 'The key'}
          onClose={() => setKeyShown(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'primary',
              content: 'I have stored it',
              onClick: () => setKeyShown(null),
            },
          ]}
        >
          <Box sx={{ display: 'grid', gap: 2 }}>
            {/* First, before the key itself: somebody who copies the key and
                closes the dialog without reading this stores nothing. */}
            <Text sx={{ fontSize: 1, fontWeight: 'semibold' }}>
              This is shown once and cannot be shown again.
            </Text>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
              We store a hash of it, so there is no page and no support request
              that can show it to you a second time. If you lose it, rotate —
              that issues a new key and stops this one.
            </Text>
            <Box
              as="pre"
              sx={{
                fontFamily: 'mono',
                fontSize: 1,
                p: 2,
                m: 0,
                bg: 'canvas.subtle',
                borderRadius: 2,
                overflowX: 'auto',
              }}
            >
              {keyShown.key}
            </Box>
            {keyShown.rotated && (
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                {keyShown.agent}&rsquo;s previous key stopped working when this
                one was issued.
              </Text>
            )}
          </Box>
        </Dialog>
      )}

      {rotating && (
        <Dialog
          title="Rotate this key?"
          onClose={() => setRotating(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Keep it',
              onClick: () => setRotating(null),
            },
            {
              buttonType: 'danger',
              content: 'Rotate',
              onClick: confirmRotate,
              disabled: rotate.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            {rotating.name || rotating.uid} gets a new key and the current one
            stops working immediately — there is no grace period, which is the
            point of rotating. Anything still using the old key fails until you
            give it the new one. The new key is shown once.
          </Text>
        </Dialog>
      )}

      {revoking && (
        <Dialog
          title="Revoke this agent?"
          onClose={() => setRevoking(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Keep it',
              onClick: () => setRevoking(null),
            },
            {
              buttonType: 'danger',
              content: 'Revoke',
              onClick: confirmRevoke,
              disabled: revoke.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            {revoking.name || revoking.uid} stops authenticating within a minute
            and anything running on its key fails. It stays in this list, marked
            revoked, because its audit rows name it — and nothing it already did
            is undone.
          </Text>
        </Dialog>
      )}
    </Box>
  );
};

export default ServiceAgents;
