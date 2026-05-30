/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo } from 'react';
import { Box, Label, Text } from '@primer/react';
import { useCache } from '../../hooks';
import { useIAMStore } from '../../state/substates';
import { useSelectedPrincipal } from '../../hooks/useSelectedPrincipal';
import { formatFriendlyHandle } from '../../utils/Handles';
import { Principal, type PrincipalDescriptor } from './Principal';

function normalizeUserOrigin(originRaw?: string): string | undefined {
  const value = (originRaw || '').trim();
  if (!value) {
    return undefined;
  }
  const lower = value.toLowerCase();
  if (lower === 'github') {
    return 'GitHub';
  }
  if (lower === 'google') {
    return 'Google';
  }
  if (lower === 'linkedin') {
    return 'LinkedIn';
  }
  if (lower === 'microsoft') {
    return 'Microsoft';
  }
  if (lower === 'datalayer') {
    return 'Datalayer';
  }
  return value;
}

export type PrincipalBadgeInput = Omit<PrincipalDescriptor, 'displayName'> & {
  displayName?: string;
};

type PrincipalBadgeProps = {
  principal?: PrincipalBadgeInput;
  showPrincipalLabel?: boolean;
  showApplyingToText?: boolean;
  showOriginLabel?: boolean;
  principalLabel?: string;
  isAdmin?: boolean;
  sx?: any;
};

/**
 * PrincipalBadge — small inline pill that displays a resolved principal
 * (user / organization / team). Falls back to the currently selected
 * principal when no explicit `principal` prop is supplied.
 */
export const PrincipalBadge = ({
  principal: providedPrincipal,
  showPrincipalLabel = true,
  showApplyingToText = true,
  showOriginLabel = true,
  principalLabel = 'Principal',
  isAdmin = false,
  sx,
}: PrincipalBadgeProps = {}) => {
  const { user } = useIAMStore();
  const {
    selectedPrincipalKind,
    selectedPrincipalUid,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationHandle,
  } = useSelectedPrincipal();
  const { useUser, useOrganization } = useCache();

  const basePrincipal = useMemo<PrincipalBadgeInput>(() => {
    if (providedPrincipal) {
      return {
        ...providedPrincipal,
        displayName:
          providedPrincipal.displayName ||
          providedPrincipal.handle ||
          providedPrincipal.uid ||
          'Principal',
      };
    }

    if (selectedPrincipalKind === 'organization') {
      return {
        kind: 'organization',
        uid: selectedPrincipalUid,
        handle: selectedPrincipalHandle,
        accountHandle: selectedPrincipalHandle,
        displayName: selectedPrincipalHandle
          ? `@${formatFriendlyHandle(selectedPrincipalHandle)}`
          : 'Organization',
        origin: 'Datalayer',
      };
    }

    if (selectedPrincipalKind === 'team') {
      const teamHandle = selectedPrincipalHandle || 'team';
      const orgHandle = selectedTeamParentOrganizationHandle || 'organization';
      return {
        kind: 'team',
        uid: selectedPrincipalUid,
        handle: `${orgHandle}/${teamHandle}`,
        accountHandle: teamHandle,
        displayName: `@${formatFriendlyHandle(orgHandle)}/${formatFriendlyHandle(teamHandle)}`,
        origin: 'Datalayer',
      };
    }

    const fullName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const resolvedHandle = user?.handle || selectedPrincipalHandle;
    const fallbackHandle = resolvedHandle
      ? `@${formatFriendlyHandle(resolvedHandle)}`
      : '@me';

    return {
      kind: 'user',
      uid: user?.id || selectedPrincipalUid,
      displayName: fullName || fallbackHandle,
      handle: resolvedHandle,
      accountHandle: resolvedHandle,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      avatarUrl: user?.avatarUrl,
      origin: normalizeUserOrigin(user?.origin),
    };
  }, [
    providedPrincipal,
    selectedPrincipalKind,
    selectedPrincipalUid,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationHandle,
    user?.id,
    user?.origin,
    user?.handle,
    user?.firstName,
    user?.lastName,
    user?.email,
    user?.avatarUrl,
  ]);

  const userLookupUid =
    basePrincipal.kind === 'user' ? String(basePrincipal.uid || '') : '';
  const organizationLookupUid =
    basePrincipal.kind === 'organization'
      ? String(basePrincipal.uid || '')
      : '';

  const { data: resolvedUser } = useUser(userLookupUid);
  const { data: resolvedOrganization } = useOrganization(organizationLookupUid);

  const principal = useMemo<PrincipalDescriptor>(() => {
    if (basePrincipal.kind === 'organization') {
      const resolvedHandle =
        resolvedOrganization?.handle ||
        basePrincipal.handle ||
        basePrincipal.accountHandle;
      const normalizedHandle = resolvedHandle
        ? formatFriendlyHandle(resolvedHandle)
        : 'organization';
      return {
        kind: 'organization',
        uid: basePrincipal.uid,
        displayName:
          resolvedOrganization?.name ||
          basePrincipal.displayName ||
          `@${normalizedHandle}`,
        handle: resolvedHandle,
        accountHandle: resolvedHandle,
        origin: basePrincipal.origin || 'Datalayer',
      };
    }

    if (basePrincipal.kind === 'team') {
      return {
        kind: 'team',
        uid: basePrincipal.uid,
        displayName:
          basePrincipal.displayName ||
          basePrincipal.handle ||
          basePrincipal.uid ||
          'Team',
        handle: basePrincipal.handle,
        accountHandle: basePrincipal.accountHandle,
        avatarUrl: basePrincipal.avatarUrl,
        origin: basePrincipal.origin,
      };
    }

    const fullName = [
      resolvedUser?.firstName || basePrincipal.firstName,
      resolvedUser?.lastName || basePrincipal.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    const resolvedHandle =
      resolvedUser?.handle ||
      basePrincipal.handle ||
      basePrincipal.accountHandle;
    const fallbackHandle = resolvedHandle
      ? `@${formatFriendlyHandle(resolvedHandle)}`
      : '@me';
    const resolvedDisplayName =
      resolvedUser?.displayName ||
      basePrincipal.displayName ||
      fullName ||
      fallbackHandle;
    const origin = normalizeUserOrigin(
      resolvedUser?.origin || basePrincipal.origin,
    );

    return {
      kind: 'user',
      uid: resolvedUser?.uid || basePrincipal.uid,
      displayName: resolvedDisplayName,
      handle: resolvedHandle,
      accountHandle: resolvedHandle,
      firstName: resolvedUser?.firstName || basePrincipal.firstName,
      lastName: resolvedUser?.lastName || basePrincipal.lastName,
      email: resolvedUser?.email || basePrincipal.email,
      avatarUrl: resolvedUser?.avatarUrl || basePrincipal.avatarUrl,
      origin,
    };
  }, [
    basePrincipal,
    resolvedOrganization?.name,
    resolvedOrganization?.handle,
    resolvedUser?.uid,
    resolvedUser?.displayName,
    resolvedUser?.handle,
    resolvedUser?.firstName,
    resolvedUser?.lastName,
    resolvedUser?.email,
    resolvedUser?.avatarUrl,
    resolvedUser?.origin,
  ]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        bg: 'canvas.subtle',
        ...sx,
      }}
    >
      {showPrincipalLabel && (
        <Label size="small" variant="accent">
          {principalLabel}
        </Label>
      )}
      {showApplyingToText && (
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Applying to</Text>
      )}
      <Principal principal={principal} isAdmin={isAdmin} />
      {showOriginLabel && principal.origin && (
        <Label size="small" variant="secondary">
          {principal.origin}
        </Label>
      )}
    </Box>
  );
};

export default PrincipalBadge;
