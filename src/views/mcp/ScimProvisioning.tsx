/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The directory's other half: who exists, and who has left.
 *
 * The identity provider above signs people in. It can only ever act on
 * somebody who *arrives* — which makes it useless for the thing an
 * organization actually needs from a directory, because the person who left
 * is exactly the person who does not turn up. That is what SCIM is for, and
 * why this sits under the same page rather than somewhere else.
 *
 * **The status line is the point of this view, not the table.** A table of
 * tokens looks almost identical in three quite different situations: a live
 * integration; one whose every token has been revoked; and one configured
 * months ago that has never once been called. In the last two, nobody is
 * being deprovisioned — and an administrator reading rows would have to
 * notice an empty "last used" column to know it. So the state is computed
 * (`scimStatus`) and said in a sentence, in the colour that matches.
 *
 * **The secret is shown once.** Only a SHA-256 of it is stored, so there is
 * no call that could show it again and this view offers none. The dialog
 * says so before the value, not after it.
 *
 * @module views/mcp/ScimProvisioning
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
import { KebabHorizontalIcon, PeopleIcon } from '@primer/octicons-react';

import { McpErrorBlankslate } from '../../components/mcp';
import { useCoreStore } from '../../state';
import { useToast } from '../../hooks';
import {
  useCreateScimToken,
  useRevokeScimToken,
  useRotateScimToken,
  useScimTokens,
} from '../../hooks/useMcp';
import { scimBaseUrl, scimStatus } from '../../api/iam/scimTokens';
import type { ScimToken } from '../../api/iam/scimTokens';
import { timeAgo } from './format';
import type { McpErrorStateFn } from './types';

export interface ScimProvisioningProps {
  errorState: McpErrorStateFn;
  orgUid: string;
  /**
   * Read-only for anybody who is not an owner. A SCIM token *is* the
   * organization's provisioning authority — whoever holds one can remove
   * anybody from it.
   */
  readOnly?: boolean;
  showTitle?: boolean;
}

type TokenRow = ScimToken & { id: string };

/**
 * What the status line says, and how alarming it looks.
 *
 * Exported because these sentences *are* the feature. The table below them
 * is nearly identical in all four states, and the whole reason this view
 * exists is that "a SCIM token is configured" and "people are actually being
 * removed" are different facts. A message that reassured in a state where
 * nobody is being deprovisioned would be worse than no view at all, so it is
 * held by a test rather than by care taken while writing it.
 */
export const SCIM_STATUS_MESSAGES: Record<
  ReturnType<typeof scimStatus>['state'],
  { variant: 'default' | 'success' | 'warning'; heading: string; body: string }
> = {
  none: {
    variant: 'default',
    heading: 'No directory is provisioning into this organization',
    body:
      'People are added and removed by hand. Issue a token to let the ' +
      'directory do it — and, more importantly, to have it remove people ' +
      'when they leave.',
  },
  revoked: {
    variant: 'warning',
    heading: 'Every SCIM token is revoked — nobody is being deprovisioned',
    body:
      'The directory can no longer reach this organization. Anybody it ' +
      'removes stays a member here until somebody does it by hand. Rotate a ' +
      'token, or issue a new one, and reconfigure the directory with it.',
  },
  'never-used': {
    variant: 'warning',
    heading: 'A token exists and the directory has never used it',
    body:
      'Nothing has been provisioned or deprovisioned through it. Either the ' +
      'directory has not been configured with it yet, or it was configured ' +
      'with a token that has since been rotated.',
  },
  active: {
    variant: 'success',
    heading: 'The directory is provisioning into this organization',
    body:
      'People it adds become members; people it removes lose their ' +
      'membership and, with it, every agent grant this organization gave ' +
      'them.',
  },
};

export const ScimProvisioning = ({
  errorState,
  orgUid,
  readOnly = false,
  showTitle = true,
}: ScimProvisioningProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const iamUrl = useCoreStore(state => state.configuration.iamUrl);
  const tokens = useScimTokens(orgUid);
  const create = useCreateScimToken(orgUid);
  const rotate = useRotateScimToken(orgUid);
  const revoke = useRevokeScimToken(orgUid);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  /** The one moment a secret exists in this process. Cleared on close. */
  const [secret, setSecret] = useState('');
  // Primer's Dialog wants a non-nullable `RefObject<HTMLElement>`. React
  // 19's `useRef(null)` is nullable, and this ref only ever reaches Dialog,
  // so narrow it once here — the same way `IdentityProviders` does.
  const returnFocusRef = useRef<HTMLElement>(
    null,
  ) as React.RefObject<HTMLElement>;

  const rows: TokenRow[] = useMemo(
    () => (tokens.data ?? []).map(entry => ({ ...entry, id: entry.uid })),
    [tokens.data],
  );

  const status = useMemo(() => scimStatus(tokens.data ?? []), [tokens.data]);

  const closeSecret = () => setSecret('');

  const openCreate = () => {
    setName('');
    setCreating(true);
  };

  const submitCreate = async () => {
    try {
      const minted = await create.mutateAsync(name.trim() || 'SCIM');
      setCreating(false);
      // Straight into the one dialog that will ever hold it.
      setSecret(minted.secret);
    } catch (error) {
      enqueueToast(
        error instanceof Error
          ? error.message
          : 'The token could not be created.',
        { variant: 'error' },
      );
    }
  };

  const doRotate = async (uid: string) => {
    try {
      const minted = await rotate.mutateAsync(uid);
      setSecret(minted.secret);
    } catch (error) {
      enqueueToast(
        error instanceof Error
          ? error.message
          : 'The token could not be rotated.',
        { variant: 'error' },
      );
    }
  };

  const doRevoke = async (uid: string) => {
    try {
      await revoke.mutateAsync(uid);
      enqueueToast('SCIM token revoked.', { variant: 'success' });
    } catch (error) {
      enqueueToast(
        error instanceof Error
          ? error.message
          : 'The token could not be revoked.',
        { variant: 'error' },
      );
    }
  };

  const columns: DataTableProps<TokenRow>['columns'] = [
    {
      header: 'Name',
      field: 'name',
      rowHeader: true,
      renderCell: row => (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Text sx={{ fontWeight: 'semibold' }}>{row.name || 'SCIM'}</Text>
          {row.revoked && (
            <Label variant="danger" size="small">
              Revoked
            </Label>
          )}
        </Box>
      ),
    },
    {
      header: 'Last used',
      field: 'lastUsedAt',
      renderCell: row =>
        row.revoked ? (
          <Text sx={{ color: 'fg.muted' }}>—</Text>
        ) : row.lastUsedAt ? (
          <Text>{timeAgo(row.lastUsedAt)}</Text>
        ) : (
          // Said rather than left blank. An empty cell reads as "no data
          // yet"; this is the difference between a working integration and
          // one nobody ever pointed a directory at.
          <Text sx={{ color: 'attention.fg' }}>Never</Text>
        ),
    },
    {
      header: 'Secret rotated',
      field: 'rotatedAt',
      renderCell: row => <Text>{timeAgo(row.rotatedAt) || '—'}</Text>,
    },
    ...(readOnly
      ? []
      : [
          {
            header: '',
            field: 'uid' as const,
            renderCell: (row: TokenRow) => (
              <ActionMenu>
                <ActionMenu.Anchor>
                  <IconButton
                    icon={KebabHorizontalIcon}
                    aria-label={`Actions for ${row.name || 'this token'}`}
                    variant="invisible"
                  />
                </ActionMenu.Anchor>
                <ActionMenu.Overlay width="medium">
                  <ActionList>
                    <ActionList.Item
                      disabled={row.revoked}
                      onSelect={() => void doRotate(row.uid)}
                    >
                      Rotate secret
                      <ActionList.Description variant="block">
                        The old secret stops at once. The directory must be
                        reconfigured with the new one.
                      </ActionList.Description>
                    </ActionList.Item>
                    <ActionList.Item
                      variant="danger"
                      disabled={row.revoked}
                      onSelect={() => void doRevoke(row.uid)}
                    >
                      Revoke
                      <ActionList.Description variant="block">
                        Provisioning through it stops. The rows it wrote stay
                        readable.
                      </ActionList.Description>
                    </ActionList.Item>
                  </ActionList>
                </ActionMenu.Overlay>
              </ActionMenu>
            ),
          },
        ]),
  ];

  if (tokens.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(tokens.error, 'SCIM provisioning')}
        onRetry={() => tokens.refetch()}
      />
    );
  }

  const shown = SCIM_STATUS_MESSAGES[status.state];

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
              Directory provisioning
            </Heading>
            <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
              Over SCIM. Sign-in can only act on somebody who turns up; this is
              what removes the person who does not.
            </Text>
          </Box>
          {!readOnly && (
            <Button
              variant="primary"
              ref={returnFocusRef as React.RefObject<HTMLButtonElement>}
              onClick={openCreate}
            >
              New SCIM token
            </Button>
          )}
        </Box>
      )}

      {tokens.isPending && !tokens.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : (
        <>
          <Flash variant={shown.variant}>
            <Text as="p" sx={{ fontWeight: 'semibold', m: 0 }}>
              {shown.heading}
            </Text>
            <Text as="p" sx={{ fontSize: 1, mt: 1, mb: 0 }}>
              {shown.body}
            </Text>
            {status.lastUsedAt && (
              <Text
                as="p"
                sx={{ fontSize: 1, mt: 1, mb: 0, color: 'fg.muted' }}
              >
                Last provisioning call {timeAgo(status.lastUsedAt)}.
              </Text>
            )}
          </Flash>

          {rows.length > 0 ? (
            <>
              <Table.Container>
                <Table.Title as="h3" id="scim-tokens">
                  SCIM tokens
                </Table.Title>
                <Table.Subtitle as="p" id="scim-tokens-subtitle">
                  A revoked token is kept rather than deleted, so the
                  provisioning it did stays attributable.
                </Table.Subtitle>
                <DataTable
                  aria-labelledby="scim-tokens"
                  aria-describedby="scim-tokens-subtitle"
                  data={rows}
                  columns={columns}
                />
              </Table.Container>

              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  p: 3,
                  display: 'grid',
                  gap: 2,
                }}
              >
                <Text sx={{ fontWeight: 'semibold', fontSize: 1 }}>
                  What to give the directory
                </Text>
                <FormControl>
                  <FormControl.Label>SCIM base URL</FormControl.Label>
                  <TextInput
                    block
                    readOnly
                    value={scimBaseUrl(iamUrl)}
                    aria-describedby="scim-base-url-note"
                  />
                  <FormControl.Caption id="scim-base-url-note">
                    Okta and Entra append <code>/Users</code> themselves. Use
                    the token as a bearer credential; the token is what says
                    which organization is being provisioned, so nothing else
                    names this one.
                  </FormControl.Caption>
                </FormControl>
                <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', m: 0 }}>
                  Groups are not provisioned over SCIM — this server answers
                  them <code>501</code> saying so. Roles come from the sign-in
                  token&rsquo;s groups claim and the provider&rsquo;s role
                  mappings, above; a second source of the same fact would
                  eventually disagree with the first.
                </Text>
              </Box>
            </>
          ) : (
            <Blankslate border spacious>
              <Blankslate.Visual>
                <PeopleIcon size="medium" />
              </Blankslate.Visual>
              <Blankslate.Heading>No SCIM token</Blankslate.Heading>
              <Blankslate.Description>
                <Text sx={{ textAlign: 'center' }}>
                  Issue one to let this organization&rsquo;s directory add
                  people when they join and — the part sign-in cannot do —
                  remove them when they leave.
                </Text>
              </Blankslate.Description>
              {!readOnly && (
                <Button size="small" onClick={openCreate}>
                  New SCIM token
                </Button>
              )}
            </Blankslate>
          )}
        </>
      )}

      {creating && (
        <Dialog
          title="New SCIM token"
          onClose={() => setCreating(false)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Cancel',
              onClick: () => setCreating(false),
            },
            {
              buttonType: 'primary',
              content: 'Issue token',
              onClick: () => void submitCreate(),
              disabled: create.isPending,
            },
          ]}
        >
          <FormControl>
            <FormControl.Label>Name</FormControl.Label>
            <TextInput
              block
              autoFocus
              value={name}
              placeholder="Okta"
              onChange={event => setName(event.target.value)}
            />
            <FormControl.Caption>
              Whatever tells this directory from another. Only for your own
              reading — it is not part of the credential.
            </FormControl.Caption>
          </FormControl>
        </Dialog>
      )}

      {secret && (
        <Dialog
          title="Copy this token now"
          onClose={closeSecret}
          footerButtons={[
            { buttonType: 'primary', content: 'Done', onClick: closeSecret },
          ]}
        >
          <Box sx={{ display: 'grid', gap: 2 }}>
            {/* Before the value, not after it. Somebody who reads this
                afterwards has already closed the dialog. */}
            <Flash variant="warning">
              This is the only time this token is shown. Only a hash of it is
              stored, so it cannot be shown again — if it is lost, rotate.
            </Flash>
            <TextInput
              block
              readOnly
              value={secret}
              aria-label="SCIM token"
              sx={{ fontFamily: 'mono' }}
              onFocus={event => event.target.select()}
            />
            <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', m: 0 }}>
              Give it to the directory as a bearer token, with the base URL{' '}
              <code>{scimBaseUrl(iamUrl)}</code>.
            </Text>
          </Box>
        </Dialog>
      )}
    </Box>
  );
};

export default ScimProvisioning;
