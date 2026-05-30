/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ActionMenu, Box, Button, Text } from '@primer/react';
import { useNavigate } from '../../hooks';
import { PrincipalAvatar } from './PrincipalAvatar';

export type PrincipalKind = 'user' | 'team' | 'organization';

export type PrincipalDetailsOverlayProps = {
  kind: PrincipalKind;
  uid?: string;
  displayName: string;
  handle?: string;
  accountHandle?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  origin?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
};

function normalize(value?: string): string {
  return (value || '').trim();
}

export function buildPrincipalProfilePath({
  kind,
  uid,
  handle,
  accountHandle,
  isAdmin,
}: {
  kind: PrincipalKind;
  uid?: string;
  handle?: string;
  accountHandle?: string;
  isAdmin?: boolean;
}): string | null {
  const normalizedUid = normalize(uid);
  const normalizedHandle = normalize(handle);
  const normalizedAccountHandle = normalize(accountHandle);
  const safeHandle =
    normalizedHandle && normalizedHandle !== normalizedUid
      ? normalizedHandle
      : '';

  if (kind === 'user') {
    if (isAdmin && normalizedUid) {
      return `/admin/management/iam/users/${normalizedUid}`;
    }
    if (safeHandle) {
      return `/${safeHandle}`;
    }
    return null;
  }

  if (kind === 'team') {
    if (normalizedAccountHandle && safeHandle) {
      return `/${normalizedAccountHandle}/team/${safeHandle}`;
    }
    if (safeHandle.includes('/')) {
      const [orgHandle, teamHandle] = safeHandle.split('/', 2);
      if (orgHandle && teamHandle) {
        return `/${orgHandle}/team/${teamHandle}`;
      }
    }
    if (safeHandle) {
      return `/datalayer/team/${safeHandle}`;
    }
    return null;
  }

  if (safeHandle) {
    return `/${safeHandle}`;
  }
  return null;
}

export function PrincipalDetailsOverlay({
  kind,
  uid,
  displayName,
  handle,
  accountHandle,
  firstName,
  lastName,
  email,
  origin,
  avatarUrl,
  isAdmin = false,
}: PrincipalDetailsOverlayProps): JSX.Element {
  const navigate = useNavigate();

  const normalizedDisplayName =
    normalize(displayName) ||
    normalize(handle) ||
    normalize(uid) ||
    'Principal';
  const normalizedHandle = normalize(handle);
  const normalizedUid = normalize(uid);
  const targetPath = buildPrincipalProfilePath({
    kind,
    uid: normalizedUid,
    handle: normalizedHandle,
    accountHandle,
    isAdmin,
  });

  return (
    <ActionMenu>
      <ActionMenu.Anchor>
        <Box
          as="button"
          type="button"
          sx={{
            fontWeight: 'semibold',
            color: 'accent.fg',
            textDecoration: 'underline',
            background: 'transparent',
            border: 0,
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            ':hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {normalizedDisplayName}
        </Box>
      </ActionMenu.Anchor>
      <ActionMenu.Overlay width="large">
        <Box sx={{ display: 'grid', gap: 3, p: 4, minWidth: 420 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PrincipalAvatar
              kind={kind}
              avatarUrl={avatarUrl}
              alt={normalizedDisplayName}
              size={40}
            />
            <Box sx={{ display: 'grid', gap: 0.5 }}>
              <Text sx={{ fontWeight: 'semibold' }}>
                {normalizedDisplayName}
              </Text>
              {normalizedHandle ? (
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  @{normalizedHandle}
                </Text>
              ) : null}
            </Box>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: 1,
              alignItems: 'baseline',
            }}
          >
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Type</Text>
            <Text sx={{ fontSize: 1 }}>{kind}</Text>
            {normalizedHandle ? (
              <>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Handle</Text>
                <Text sx={{ fontSize: 1 }}>@{normalizedHandle}</Text>
              </>
            ) : null}
            {normalizedUid ? (
              <>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>UID</Text>
                <Text sx={{ fontSize: 1 }}>{normalizedUid}</Text>
              </>
            ) : null}
            {kind === 'user' ? (
              <>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>First name</Text>
                <Text sx={{ fontSize: 1 }}>{firstName || 'N/A'}</Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Last name</Text>
                <Text sx={{ fontSize: 1 }}>{lastName || 'N/A'}</Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Origin</Text>
                <Text sx={{ fontSize: 1 }}>{origin || 'Datalayer'}</Text>
                {email ? (
                  <>
                    <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Email</Text>
                    <Text sx={{ fontSize: 1 }}>{email}</Text>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Origin</Text>
                <Text sx={{ fontSize: 1 }}>{origin || 'Datalayer'}</Text>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={() => {
                if (targetPath) {
                  navigate(targetPath);
                }
              }}
              disabled={!targetPath}
            >
              View profile
            </Button>
          </Box>
        </Box>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}

export default PrincipalDetailsOverlay;
