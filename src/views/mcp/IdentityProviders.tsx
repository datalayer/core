/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An organization's own identity provider.
 *
 * Enterprise sign-in used to be one Okta for the whole deployment. Here an
 * organization registers the directory it already has — issuer, client id,
 * the email domains it claims — and a sign-in with an address at one of
 * those domains is routed to it.
 *
 * **A claim is not proof, and this page is careful to say so.** A domain
 * just typed in and one proved by DNS are shown differently on purpose: a
 * grey "claimed" label beside a domain that routes nothing yet, a green
 * "verified" one beside a domain that does. Collapsing the two into one list
 * would let an owner believe a claim is already live when it is not — and
 * until it is verified, nobody signs in through it at all.
 *
 * **The client secret never appears here**, only its name in the
 * organization's own secret store. This page has no field that could render
 * one, by construction rather than by care taken while writing it.
 *
 * @module views/mcp/IdentityProviders
 */

import type { JSX } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Flash,
  FormControl,
  Heading,
  IconButton,
  Label,
  Select,
  Spinner,
  Text,
  TextInput,
  ToggleSwitch,
} from '@primer/react';
import {
  Blankslate,
  DataTable,
  Dialog,
  Table,
} from '@primer/react/experimental';
import type { DataTableProps } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import {
  KebabHorizontalIcon,
  KeyIcon,
  TrashIcon,
} from '@primer/octicons-react';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useCreateIdentityProvider,
  useDeleteIdentityProvider,
  useDomainVerification,
  useIdentityProviders,
  useSetIdentityProviderEnabled,
  useUpdateIdentityProvider,
  useVerifyDomain,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import {
  IdentityProviderInvalid,
  ORGANIZATION_ROLES,
  TEAM_ROLES,
  type IdentityProvider,
  type IdentityProviderDraft,
  type RoleMapping,
} from '../../api/iam/identityProviders';
import type { McpErrorStateFn } from './types';

export interface IdentityProvidersProps {
  errorState: McpErrorStateFn;
  orgUid: string;
  /** Read-only for anybody who is not an owner: registering a provider
   * decides who may get into the organization at all. */
  readOnly?: boolean;
  showTitle?: boolean;
}

type ProviderRow = IdentityProvider & { id: string };

const ROLE_LABELS: Record<string, string> = {
  organization_owner: 'Organization owner',
  organization_security_auditor: 'Organization security auditor',
  organization_user_reviewer: 'Organization usage reviewer',
  organization_member: 'Organization member',
  team_owner: 'Team owner',
  team_member: 'Team member',
};

const roleLabel = (role: string): string => ROLE_LABELS[role] ?? role;

const isTeamRole = (role: string): boolean =>
  (TEAM_ROLES as readonly string[]).includes(role);

const BLANK: IdentityProviderDraft = {
  name: '',
  protocol: 'oidc',
  issuer: '',
  clientId: '',
  clientSecretRef: '',
  domains: [],
  groupClaim: 'groups',
  allowEmailLinking: false,
  roleMappings: [],
  enabled: true,
};

const domainsToText = (domains: string[]): string => domains.join(', ');

const textToDomains = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(/[,\s]+/)
        .map(domain => domain.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

export const IdentityProviders = ({
  errorState,
  orgUid,
  readOnly = false,
  showTitle = true,
}: IdentityProvidersProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const providers = useIdentityProviders(orgUid);
  const create = useCreateIdentityProvider(orgUid);
  const update = useUpdateIdentityProvider(orgUid);
  const setEnabled = useSetIdentityProviderEnabled(orgUid);
  const remove = useDeleteIdentityProvider(orgUid);
  const domainVerification = useDomainVerification(orgUid);
  const verifyDomain = useVerifyDomain(orgUid);

  const [editing, setEditing] = useState<IdentityProvider | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<IdentityProviderDraft>(BLANK);
  const [domainsText, setDomainsText] = useState('');
  const [refusal, setRefusal] = useState('');
  const [removing, setRemoving] = useState<ProviderRow | null>(null);
  const [managingDomains, setManagingDomains] =
    useState<IdentityProvider | null>(null);
  // Primer 37 types Dialog's focus refs with React 18's non-nullable
  // `RefObject<HTMLElement>`. React 19's `useRef(null)` is nullable, and this
  // ref is only handed to Dialog, so narrow it once here.
  const returnFocusRef = useRef<HTMLElement>(
    null,
  ) as React.RefObject<HTMLElement>;

  const rows = useMemo<ProviderRow[]>(
    () =>
      (providers.data ?? []).map(provider => ({
        ...provider,
        id: provider.uid,
      })),
    [providers.data],
  );

  const openCreate = () => {
    setDraft(BLANK);
    setDomainsText('');
    setRefusal('');
    setCreating(true);
  };

  const openEdit = (provider: IdentityProvider) => {
    const {
      uid: _uid,
      orgUid: _org,
      verifiedDomains: _verified,
      createdBy: _by,
      createdAt: _c,
      updatedAt: _u,
      version: _v,
      ...rest
    } = provider;
    setDraft(rest);
    setDomainsText(domainsToText(provider.domains));
    setRefusal('');
    setEditing(provider);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setRefusal('');
  };

  const onError = (error: Error) => {
    if (error instanceof IdentityProviderInvalid) {
      // The registry's own words, beside the form: it names what is wrong,
      // and the person can still fix it without guessing.
      setRefusal(error.message);
      return;
    }
    enqueueToast(`Could not save: ${error.message}`, { variant: 'error' });
  };

  const apply = () => {
    setRefusal('');
    const domains = textToDomains(domainsText);
    if (domains.length === 0) {
      setRefusal(
        'At least one email domain is needed; a provider no domain routes ' +
          'to is one nobody can sign in through.',
      );
      return;
    }
    const payload: IdentityProviderDraft = { ...draft, domains };
    if (editing) {
      update.mutate(
        { uid: editing.uid, provider: payload },
        {
          onSuccess: () => {
            close();
            enqueueToast('Identity provider saved.', { variant: 'success' });
          },
          onError,
        },
      );
      return;
    }
    create.mutate(payload, {
      onSuccess: () => {
        close();
        enqueueToast(
          'Identity provider registered. Verify a domain before anybody ' +
            'signs in through it.',
          { variant: 'success' },
        );
      },
      onError,
    });
  };

  /** Switching a provider off leaves its configuration here; only sign-in
   * through it stops. */
  const toggle = (provider: IdentityProvider, enabled: boolean) => {
    setEnabled.mutate(
      { uid: provider.uid, enabled },
      {
        onError: error =>
          enqueueToast(`Could not change the provider: ${error.message}`, {
            variant: 'error',
          }),
      },
    );
  };

  const confirmRemove = () => {
    const provider = removing;
    if (!provider) {
      return;
    }
    remove.mutate(provider.uid, {
      onSuccess: () => {
        setRemoving(null);
        enqueueToast('Identity provider removed.', { variant: 'success' });
      },
      onError: error => {
        setRemoving(null);
        enqueueToast(`Could not remove: ${error.message}`, {
          variant: 'error',
        });
      },
    });
  };

  const set = <K extends keyof IdentityProviderDraft>(
    key: K,
    value: IdentityProviderDraft[K],
  ) => setDraft(current => ({ ...current, [key]: value }));

  const setMapping = (index: number, patch: Partial<RoleMapping>) => {
    setDraft(current => ({
      ...current,
      roleMappings: current.roleMappings.map((mapping, i) =>
        i === index ? { ...mapping, ...patch } : mapping,
      ),
    }));
  };

  const addMapping = () =>
    setDraft(current => ({
      ...current,
      roleMappings: [
        ...current.roleMappings,
        { group: '', role: 'organization_member', teamUid: '' },
      ],
    }));

  const removeMapping = (index: number) =>
    setDraft(current => ({
      ...current,
      roleMappings: current.roleMappings.filter((_, i) => i !== index),
    }));

  const columns: DataTableProps<ProviderRow>['columns'] = [
    {
      header: 'Provider',
      id: 'name',
      rowHeader: true,
      width: 'growCollapse',
      renderCell: row => (
        <Box sx={{ display: 'grid' }}>
          <Text sx={{ fontSize: 1, fontWeight: 'bold' }}>{row.name}</Text>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{row.issuer}</Text>
        </Box>
      ),
    },
    {
      header: 'Domains',
      id: 'domains',
      width: 'growCollapse',
      renderCell: row => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {row.domains.length === 0 && (
            <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>none</Text>
          )}
          {row.domains.map(domain => (
            <Label
              key={domain}
              size="small"
              variant={
                row.verifiedDomains.includes(domain) ? 'success' : 'secondary'
              }
            >
              {domain}
              {row.verifiedDomains.includes(domain)
                ? ' · verified'
                : ' · claimed'}
            </Label>
          ))}
        </Box>
      ),
    },
    {
      header: 'On',
      id: 'enabled',
      width: '90px',
      renderCell: row => (
        <>
          <Text id={`idp-toggle-${row.uid}`} sx={{ display: 'none' }}>
            {`Sign-in through ${row.name}`}
          </Text>
          <ToggleSwitch
            size="small"
            checked={row.enabled}
            disabled={readOnly || setEnabled.isPending}
            aria-labelledby={`idp-toggle-${row.uid}`}
            onClick={() => toggle(row, !row.enabled)}
          />
        </>
      ),
    },
    {
      header: '',
      id: 'actions',
      width: '48px',
      align: 'end',
      renderCell: row =>
        readOnly ? (
          <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>—</Text>
        ) : (
          <ActionMenu>
            <ActionMenu.Anchor>
              <Button
                variant="invisible"
                size="small"
                aria-label={`Actions for ${row.name}`}
                icon={KebabHorizontalIcon}
              />
            </ActionMenu.Anchor>
            <ActionMenu.Overlay align="end">
              <ActionList>
                <ActionList.Item onSelect={() => openEdit(row)}>
                  Edit
                </ActionList.Item>
                <ActionList.Item
                  onSelect={() => setManagingDomains(row)}
                  disabled={row.domains.length === 0}
                >
                  Manage domains
                </ActionList.Item>
                <ActionList.Item
                  variant="danger"
                  onSelect={() => setRemoving(row)}
                >
                  Remove
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        ),
    },
  ];

  if (providers.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(providers.error, 'Identity providers')}
        onRetry={() => providers.refetch()}
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
              Identity providers
            </Heading>
            <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
              The directory this organization signs in through. A domain is
              claimed the moment it is typed here and routes nothing until it is
              verified.
            </Text>
          </Box>
          {!readOnly && (
            <Button variant="primary" onClick={openCreate}>
              New provider
            </Button>
          )}
        </Box>
      )}

      {providers.isPending && !providers.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : rows.length > 0 ? (
        <Table.Container>
          <Table.Title as="h3" id="identity-providers">
            Providers
          </Table.Title>
          <Table.Subtitle as="p" id="identity-providers-subtitle">
            A provider switched off keeps its configuration and its verified
            domains; only sign-in through it stops.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="identity-providers"
            aria-describedby="identity-providers-subtitle"
            data={rows}
            columns={columns}
          />
        </Table.Container>
      ) : (
        <Blankslate border spacious>
          <Blankslate.Visual>
            <KeyIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>No directory registered</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>
              People here sign in the ordinary way. Register a provider to let
              them sign in through the directory this organization already has.
            </Text>
          </Blankslate.Description>
          {!readOnly && (
            <Button size="small" onClick={openCreate}>
              New provider
            </Button>
          )}
        </Blankslate>
      )}

      {(creating || editing) && (
        <Dialog
          title={editing ? 'Edit identity provider' : 'New identity provider'}
          onClose={close}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            { buttonType: 'default', content: 'Cancel', onClick: close },
            {
              buttonType: 'primary',
              content: editing ? 'Save' : 'Register',
              onClick: apply,
              disabled: create.isPending || update.isPending,
            },
          ]}
        >
          <Box sx={{ display: 'grid', gap: 3 }}>
            {refusal && (
              <Flash variant="danger">
                <Text sx={{ fontSize: 1 }}>{refusal}</Text>
              </Flash>
            )}

            <FormControl required>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput
                block
                value={draft.name}
                onChange={event => set('name', event.target.value)}
                placeholder="Acme Okta"
              />
              <FormControl.Caption>
                What an administrator sees in this list.
              </FormControl.Caption>
            </FormControl>

            <FormControl required>
              <FormControl.Label>Issuer</FormControl.Label>
              <TextInput
                block
                value={draft.issuer}
                onChange={event => set('issuer', event.target.value)}
                placeholder="https://acme.okta.com"
              />
              <FormControl.Caption>
                Must be https — discovery, the signing keys and the sign-in
                redirect all travel over it.
              </FormControl.Caption>
            </FormControl>

            <Box
              sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}
            >
              <FormControl required>
                <FormControl.Label>Client ID</FormControl.Label>
                <TextInput
                  block
                  value={draft.clientId}
                  onChange={event => set('clientId', event.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Client secret</FormControl.Label>
                <TextInput
                  block
                  value={draft.clientSecretRef}
                  onChange={event => set('clientSecretRef', event.target.value)}
                  placeholder="the secret's name, not the secret"
                />
                <FormControl.Caption>
                  The name of a secret already in this organization&rsquo;s
                  store — never the secret itself.
                </FormControl.Caption>
              </FormControl>
            </Box>

            <FormControl required>
              <FormControl.Label>Email domains</FormControl.Label>
              <TextInput
                block
                value={domainsText}
                onChange={event => setDomainsText(event.target.value)}
                placeholder="acme.com, acme.io"
              />
              <FormControl.Caption>
                Comma-separated. Claiming a domain is free and routes nothing —
                verify it below once it is registered before anybody can sign in
                through it.
              </FormControl.Caption>
            </FormControl>

            <FormControl>
              <FormControl.Label>Group claim</FormControl.Label>
              <TextInput
                block
                value={draft.groupClaim}
                onChange={event => set('groupClaim', event.target.value)}
                placeholder="groups"
              />
              <FormControl.Caption>
                Which claim in the token carries the groups the mapping below
                reads.
              </FormControl.Caption>
            </FormControl>

            <FormControl>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ToggleSwitch
                  size="small"
                  checked={draft.allowEmailLinking}
                  aria-labelledby="allow-email-linking-label"
                  onClick={() =>
                    set('allowEmailLinking', !draft.allowEmailLinking)
                  }
                />
                <FormControl.Label id="allow-email-linking-label">
                  Adopt an existing account on a verified address
                </FormControl.Label>
              </Box>
              <FormControl.Caption>
                Off by default: a sign-in whose address already has a Datalayer
                account is refused rather than signed in as that account, and
                the person is told to connect the two from a session they
                already hold. Turn this on only if the smoother rollout is worth
                it — the address still has to be on a verified domain, and the
                provider still has to say it verified it itself.
              </FormControl.Caption>
            </FormControl>

            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <FormControl.Label>Group → role mapping</FormControl.Label>
                <Button size="small" onClick={addMapping}>
                  Add mapping
                </Button>
              </Box>
              <Text
                as="p"
                sx={{ fontSize: 0, color: 'fg.muted', mt: 0, mb: 2 }}
              >
                Granted the next time somebody in the group signs in, and never
                taken back by a sign-in that omits it — a slow directory sync
                should not read as a demotion. Reaches no further than this
                organization and its own teams.
              </Text>
              {draft.roleMappings.length === 0 && (
                <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                  No mapping: everybody who signs in through this provider
                  becomes an organization member and nothing more.
                </Text>
              )}
              <Box sx={{ display: 'grid', gap: 2 }}>
                {draft.roleMappings.map((mapping, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: isTeamRole(mapping.role)
                        ? '1fr 1fr 1fr auto'
                        : '1fr 1fr auto',
                      alignItems: 'end',
                    }}
                  >
                    <FormControl>
                      <FormControl.Label>Group</FormControl.Label>
                      <TextInput
                        block
                        value={mapping.group}
                        onChange={event =>
                          setMapping(index, { group: event.target.value })
                        }
                        placeholder="admins"
                      />
                    </FormControl>
                    <FormControl>
                      <FormControl.Label>Grants</FormControl.Label>
                      <Select
                        value={mapping.role}
                        onChange={event =>
                          setMapping(index, {
                            role: event.target.value as RoleMapping['role'],
                          })
                        }
                      >
                        {ORGANIZATION_ROLES.map(role => (
                          <Select.Option key={role} value={role}>
                            {roleLabel(role)}
                          </Select.Option>
                        ))}
                        {TEAM_ROLES.map(role => (
                          <Select.Option key={role} value={role}>
                            {roleLabel(role)}
                          </Select.Option>
                        ))}
                      </Select>
                    </FormControl>
                    {isTeamRole(mapping.role) && (
                      <FormControl required>
                        <FormControl.Label>Team</FormControl.Label>
                        <TextInput
                          block
                          value={mapping.teamUid}
                          onChange={event =>
                            setMapping(index, { teamUid: event.target.value })
                          }
                          placeholder="team uid"
                        />
                      </FormControl>
                    )}
                    <IconButton
                      icon={TrashIcon}
                      variant="danger"
                      size="small"
                      aria-label="Remove this mapping"
                      onClick={() => removeMapping(index)}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Dialog>
      )}

      {managingDomains && (
        <DomainVerificationDialog
          provider={managingDomains}
          orgUid={orgUid}
          onClose={() => setManagingDomains(null)}
          fetchVerification={domainVerification}
          verify={verifyDomain}
        />
      )}

      {removing && (
        <Dialog
          title="Remove this identity provider?"
          onClose={() => setRemoving(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Keep it',
              onClick: () => setRemoving(null),
            },
            {
              buttonType: 'danger',
              content: 'Remove',
              onClick: confirmRemove,
              disabled: remove.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            Sign-in through it stops immediately and its domains stop being
            claimed. If people have used it before, consider turning it off
            instead — that keeps its uid resolvable for the sign-in rows that
            name it.
          </Text>
        </Dialog>
      )}
    </Box>
  );
};

/**
 * Proving one domain: what to publish, and the button that checks it.
 *
 * Kept as its own dialog rather than inline in the edit form, because
 * proving a domain is not part of editing the provider's configuration —
 * it is a separate act, done once DNS has actually been changed, and
 * conflating the two would make "Save" look like it also verifies.
 */
const DomainVerificationDialog = ({
  provider,
  onClose,
  fetchVerification,
  verify,
}: {
  provider: IdentityProvider;
  orgUid: string;
  onClose: () => void;
  fetchVerification: ReturnType<typeof useDomainVerification>;
  verify: ReturnType<typeof useVerifyDomain>;
}): JSX.Element => {
  const { enqueueToast } = useToast();
  const [selected, setSelected] = useState(provider.domains[0] ?? '');
  const [record, setRecord] = useState<{
    host: string;
    type: string;
    value: string;
  } | null>(null);
  const [verified, setVerified] = useState(
    provider.verifiedDomains.includes(selected),
  );
  const [refusal, setRefusal] = useState('');
  const returnFocusRef = useRef<HTMLElement>(
    null,
  ) as React.RefObject<HTMLElement>;

  const load = (domain: string) => {
    setSelected(domain);
    setRecord(null);
    setRefusal('');
    fetchVerification.mutate(
      { uid: provider.uid, domain },
      {
        onSuccess: result => {
          setRecord(result.verification);
          setVerified(result.verified);
        },
        onError: error => setRefusal(error.message),
      },
    );
  };

  const runVerify = () => {
    setRefusal('');
    verify.mutate(
      { uid: provider.uid, domain: selected },
      {
        onSuccess: updated => {
          const done = updated.verifiedDomains.includes(selected);
          setVerified(done);
          if (done) {
            enqueueToast(`${selected} is verified and now routes sign-in.`, {
              variant: 'success',
            });
          }
        },
        onError: error => {
          if (error instanceof IdentityProviderInvalid) {
            // "No TXT record was found" and the like — the exact reason DNS
            // did not check out, worth showing rather than a generic failure.
            setRefusal(error.message);
            return;
          }
          setRefusal(error.message);
        },
      },
    );
  };

  return (
    <Dialog
      title={`Verify a domain for ${provider.name}`}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      footerButtons={[
        { buttonType: 'default', content: 'Close', onClick: onClose },
      ]}
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Text as="p" sx={{ fontSize: 1, color: 'fg.muted', m: 0 }}>
          Publish the record below at your DNS provider, then check it here.
          Until it checks out, this domain routes no sign-in — a claim is not
          proof.
        </Text>

        <FormControl>
          <FormControl.Label>Domain</FormControl.Label>
          <Select value={selected} onChange={event => load(event.target.value)}>
            {provider.domains.map(domain => (
              <Select.Option key={domain} value={domain}>
                {domain}
                {provider.verifiedDomains.includes(domain) ? ' — verified' : ''}
              </Select.Option>
            ))}
          </Select>
        </FormControl>

        {refusal && (
          <Flash variant="danger">
            <Text sx={{ fontSize: 1 }}>{refusal}</Text>
          </Flash>
        )}

        {fetchVerification.isPending ? (
          <Spinner size="small" />
        ) : record ? (
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              p: 2,
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              fontFamily: 'mono',
              fontSize: 0,
            }}
          >
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              Type: {record.type}
            </Text>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              Host: {record.host}
            </Text>
            <Text sx={{ fontSize: 0, wordBreak: 'break-all' }}>
              Value: {record.value}
            </Text>
          </Box>
        ) : (
          <Button size="small" onClick={() => load(selected)}>
            Show what to publish
          </Button>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Label variant={verified ? 'success' : 'secondary'}>
            {verified ? 'Verified — routes sign-in' : 'Not yet verified'}
          </Label>
          {!verified && (
            <Button
              variant="primary"
              size="small"
              onClick={runVerify}
              disabled={verify.isPending || !selected}
            >
              {verify.isPending ? 'Checking…' : 'Check DNS now'}
            </Button>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default IdentityProviders;
