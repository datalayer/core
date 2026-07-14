/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  ActionMenu,
  Box,
  Button,
  Label,
  Text,
  ThemeProvider,
} from '@primer/react';
import { useNavigate } from '../../hooks';
import { PrincipalAvatar } from './PrincipalAvatar';
import { displayHandleText } from '../display/DisplayHandle';

export type PrincipalKind = 'personal' | 'team' | 'organization';

export type PrincipalDetailsOverlayProps = {
  kind: PrincipalKind;
  uid?: string;
  displayName: string;
  name?: string;
  description?: string;
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

function normalizeOriginLabel(origin?: string): string {
  const normalized = normalize(origin);
  if (!normalized) {
    return 'Datalayer';
  }

  const lower = normalized.toLowerCase();
  if (lower === 'google') return 'Google';
  if (lower === 'github') return 'GitHub';
  if (lower === 'linkedin') return 'LinkedIn';
  if (lower === 'microsoft') return 'Microsoft';
  if (lower === 'datalayer') return 'Datalayer';

  const extPrefix = 'urn:dla:iam:ext::';
  if (lower.startsWith(extPrefix)) {
    const suffix = normalized.slice(extPrefix.length);
    const provider = (suffix.split(':')[0] || '').trim().toLowerCase();
    if (provider === 'google') return 'Google';
    if (provider === 'github') return 'GitHub';
    if (provider === 'linkedin') return 'LinkedIn';
    if (provider === 'microsoft') return 'Microsoft';
    if (provider) {
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  }

  return normalized;
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

  if (kind === 'personal') {
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
  name,
  description,
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
  const normalizedName = normalize(name);
  const normalizedDescription = normalize(description);
  const normalizedOrigin = normalizeOriginLabel(origin);
  const resolvedHandle =
    normalizedHandle && normalizedHandle !== normalizedUid
      ? normalizedHandle
      : '';
  const targetPath = buildPrincipalProfilePath({
    kind,
    uid: normalizedUid,
    handle: resolvedHandle,
    accountHandle,
    isAdmin,
  });

  return (
    <ThemeProvider>
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
                {resolvedHandle && kind !== 'team' ? (
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    {displayHandleText(resolvedHandle)}
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
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Kind</Text>
              <Text sx={{ fontSize: 1 }}>{kind}</Text>
              {resolvedHandle && kind !== 'team' ? (
                <>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Handle</Text>
                  <Text sx={{ fontSize: 1 }}>
                    {displayHandleText(resolvedHandle)}
                  </Text>
                </>
              ) : null}
              {normalizedUid ? (
                <>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>UID</Text>
                  <Text sx={{ fontSize: 1 }}>{normalizedUid}</Text>
                </>
              ) : null}
              {kind === 'personal' ? (
                <>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    First name
                  </Text>
                  <Text sx={{ fontSize: 1 }}>{firstName || 'N/A'}</Text>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Last name</Text>
                  <Text sx={{ fontSize: 1 }}>{lastName || 'N/A'}</Text>
                  {email ? (
                    <>
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Email</Text>
                      <Text sx={{ fontSize: 1 }}>{email}</Text>
                    </>
                  ) : null}
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Origin</Text>
                  <Label
                    size="small"
                    variant="secondary"
                    title={normalizedOrigin}
                    sx={{
                      justifySelf: 'start',
                      width: 'fit-content',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {normalizedOrigin}
                  </Label>
                </>
              ) : (
                <>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Name</Text>
                  <Text sx={{ fontSize: 1 }}>
                    {normalizedName || normalizedDisplayName}
                  </Text>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    Description
                  </Text>
                  <Text sx={{ fontSize: 1 }}>
                    {normalizedDescription || 'N/A'}
                  </Text>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Origin</Text>
                  <Label
                    size="small"
                    variant="secondary"
                    title={normalizedOrigin}
                    sx={{
                      justifySelf: 'start',
                      width: 'fit-content',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {normalizedOrigin}
                  </Label>
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
                View Profile
              </Button>
            </Box>
          </Box>
        </ActionMenu.Overlay>
      </ActionMenu>
    </ThemeProvider>
  );
}

export default PrincipalDetailsOverlay;
