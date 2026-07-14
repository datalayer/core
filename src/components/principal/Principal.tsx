/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Principal – common, tunable display for an actor (user / team /
 * organization). Combines a {@link PrincipalAvatar} with a
 * {@link PrincipalDetailsOverlay} so all spots that need to show
 * "avatar + clickable name with details overlay" can share a single
 * component.
 */

import * as React from 'react';
import { Box } from '@datalayer/primer-addons';
import { useCache } from '../../hooks';
import { useIAMStore } from '../../state';
import { PrincipalAvatar, PrincipalAvatarKind } from './PrincipalAvatar';
import { PrincipalDetailsOverlay } from './PrincipalDetailsOverlay';

type PrincipalKind = PrincipalAvatarKind;

/**
 * Default maximum length applied to the placeholder shown before a principal's
 * real display name has been resolved. The placeholder (derived from the given
 * handle or uid) is truncated to this many characters.
 */
const DEFAULT_PLACEHOLDER_MAX_LENGTH = 10;

/**
 * Generic, non-informative display names that callers pass while the real
 * entity is still loading. When the provided display name is one of these we
 * prefer a handle/uid-derived placeholder instead.
 */
const GENERIC_PLACEHOLDER_DISPLAY_NAMES = new Set([
  'unknown',
  'principal',
  'personal',
  'team',
  'organization',
  'billing entity',
]);

/** Truncate a placeholder string to `maxLength`, appending an ellipsis. */
function truncatePlaceholder(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (maxLength <= 0 || trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}\u2026`;
}

/**
 * Normalised actor descriptor used by all caching resolvers. Views are
 * expected to produce one of these out of their raw API data so the
 * common component can render consistently.
 */
export type PrincipalDescriptor = {
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
};

export type PrincipalProps = {
  principal: PrincipalDescriptor;
  isAdmin?: boolean;
  avatarSize?: number;
  gap?: number;
  square?: boolean;
  /**
   * Maximum length of the placeholder (handle or uid) shown before the real
   * display name resolves. Defaults to {@link DEFAULT_PLACEHOLDER_MAX_LENGTH}.
   */
  placeholderMaxLength?: number;
  sx?: any;
};

export const Principal: React.FC<PrincipalProps> = ({
  principal,
  isAdmin = false,
  avatarSize = 20,
  gap = 2,
  square = false,
  placeholderMaxLength = DEFAULT_PLACEHOLDER_MAX_LENGTH,
  sx,
}) => {
  const {
    useUser,
    useOrganizationByHandle,
    useTeam,
    useUserPublicProfileByHandle,
    useOrganizationPublicProfileByHandle,
  } = useCache();

  // When no user is authenticated (anonymous visitor, e.g. public pages), the
  // authenticated `useUser` / `useOrganization` endpoints return 401, which
  // triggers a global logout + redirect to sign-in. For anonymous visitors we
  // resolve the principal through the public-by-handle endpoints instead, which
  // are anonymous-accessible and therefore never redirect.
  const { user: authenticatedUser } = useIAMStore();
  const isAnonymous = !authenticatedUser;

  const normalizedUid = String(principal.uid || '').trim();
  const normalizedProvidedHandle = String(principal.handle || '').trim();
  const normalizedProvidedAccountHandle = String(
    principal.accountHandle || '',
  ).trim();
  const providedHandleIsUidPlaceholder =
    !!normalizedProvidedHandle &&
    !!normalizedUid &&
    normalizedProvidedHandle === normalizedUid;
  const providedAccountHandleIsUidPlaceholder =
    !!normalizedProvidedAccountHandle &&
    !!normalizedUid &&
    normalizedProvidedAccountHandle === normalizedUid;

  const principalHandle = String(
    (!providedHandleIsUidPlaceholder ? principal.handle : '') ||
      (!providedAccountHandleIsUidPlaceholder ? principal.accountHandle : '') ||
      '',
  ).trim();
  const teamPathParts =
    principal.kind === 'team' ? principalHandle.split('/') : [];
  const teamOrganizationHandleFromPath = String(teamPathParts[0] || '').trim();
  const teamOrganizationHandleFromAccount =
    principal.kind === 'team' && !providedAccountHandleIsUidPlaceholder
      ? String(principal.accountHandle || '').trim()
      : '';
  const teamOrganizationHandle =
    teamOrganizationHandleFromPath || teamOrganizationHandleFromAccount;

  const hydratedUserQuery = useUser(
    !isAnonymous && principal.kind === 'personal'
      ? String(principal.uid || '')
      : '',
  );
  // Authenticated organizations are fetched by handle via the accounts
  // endpoint (`/api/iam/v1/accounts/{handle}`). The by-uid organization
  // endpoint (`/api/iam/v1/organizations/{uid}`) is not served and 404s, so we
  // never look an organization up by uid here.
  const organizationLookupHandle = String(principalHandle || '')
    .replace(/^@+/, '')
    .trim();
  const hydratedOrgQuery = useOrganizationByHandle(
    !isAnonymous && principal.kind === 'organization'
      ? organizationLookupHandle
      : '',
  );
  const teamOrganizationQuery = useOrganizationByHandle(
    principal.kind === 'team' ? teamOrganizationHandle : '',
  );
  const hydratedTeamQuery = useTeam(
    principal.kind === 'team' ? String(principal.uid || '') : '',
    principal.kind === 'team'
      ? String(teamOrganizationQuery.data?.id || '')
      : '',
  );
  const hydratedPublicUserQuery = useUserPublicProfileByHandle(
    isAnonymous && principal.kind === 'personal' ? principalHandle : '',
  );
  const hydratedPublicOrgQuery = useOrganizationPublicProfileByHandle(
    isAnonymous && principal.kind === 'organization' ? principalHandle : '',
  );

  // Normalise the public (snake_case) profile payloads into the same camelCase
  // shape the authenticated entities expose, so downstream logic is uniform.
  const normalizedPublicUser = React.useMemo(() => {
    const profile = hydratedPublicUserQuery.data as any;
    if (!profile) {
      return undefined;
    }
    const displayName = String(
      profile.display_name ||
        [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
        '',
    ).trim();
    return {
      displayName,
      firstName: profile.first_name,
      lastName: profile.last_name,
      handle: profile.handle,
      avatarUrl: profile.avatar_url,
      origin: profile.origin,
      email: profile.email,
    };
  }, [hydratedPublicUserQuery.data]);

  const normalizedPublicOrg = React.useMemo(() => {
    const profile = hydratedPublicOrgQuery.data as any;
    if (!profile) {
      return undefined;
    }
    return {
      displayName: String(profile.display_name || profile.name || '').trim(),
      name: profile.name,
      description: profile.description || profile.description_t,
      handle: profile.handle,
      avatarUrl: profile.avatar_url,
    };
  }, [hydratedPublicOrgQuery.data]);

  const hydratedEntity =
    principal.kind === 'personal'
      ? isAnonymous
        ? normalizedPublicUser
        : hydratedUserQuery.data
      : principal.kind === 'organization'
        ? isAnonymous
          ? normalizedPublicOrg
          : hydratedOrgQuery.data
        : principal.kind === 'team'
          ? hydratedTeamQuery.data
          : undefined;

  const hydratedDisplayName =
    principal.kind === 'personal'
      ? String(
          (hydratedEntity as any)?.displayName ||
            [
              (hydratedEntity as any)?.firstName,
              (hydratedEntity as any)?.lastName,
            ]
              .filter(Boolean)
              .join(' ') ||
            '',
        ).trim()
      : String(
          (hydratedEntity as any)?.displayName ||
            (hydratedEntity as any)?.name ||
            '',
        ).trim();

  const resolvedPrincipal: PrincipalDescriptor = {
    ...principal,
    displayName:
      hydratedDisplayName ||
      (() => {
        const providedDisplayName = String(principal.displayName || '').trim();
        const providedIsGenericPlaceholder =
          !providedDisplayName ||
          GENERIC_PLACEHOLDER_DISPLAY_NAMES.has(
            providedDisplayName.toLowerCase(),
          ) ||
          (!!normalizedUid && providedDisplayName === normalizedUid);
        // While the real display name is unresolved, prefer the given handle
        // (or uid) as a placeholder, truncated to a maximum length. Only fall
        // back to the caller-provided display name when it is meaningful.
        const placeholder = truncatePlaceholder(
          principalHandle || normalizedProvidedHandle || normalizedUid || '',
          placeholderMaxLength,
        );
        if (providedIsGenericPlaceholder) {
          return placeholder || providedDisplayName || 'Unknown';
        }
        return providedDisplayName || placeholder || 'Unknown';
      })(),
    handle:
      (!providedHandleIsUidPlaceholder ? principal.handle : undefined) ||
      String((hydratedEntity as any)?.handle || '').trim() ||
      undefined,
    accountHandle:
      (!providedAccountHandleIsUidPlaceholder
        ? principal.accountHandle
        : undefined) ||
      String((hydratedEntity as any)?.handle || '').trim() ||
      undefined,
    name:
      principal.name ||
      String((hydratedEntity as any)?.name || '').trim() ||
      undefined,
    description:
      principal.description ||
      String((hydratedEntity as any)?.description || '').trim() ||
      undefined,
    avatarUrl:
      principal.avatarUrl || (hydratedEntity as any)?.avatarUrl || undefined,
    firstName:
      principal.firstName || (hydratedEntity as any)?.firstName || undefined,
    lastName:
      principal.lastName || (hydratedEntity as any)?.lastName || undefined,
    email: principal.email || (hydratedEntity as any)?.email || undefined,
    origin: principal.origin || (hydratedEntity as any)?.origin || undefined,
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        minWidth: 0,
        ...sx,
      }}
    >
      <PrincipalAvatar
        kind={resolvedPrincipal.kind}
        avatarUrl={resolvedPrincipal.avatarUrl}
        alt={resolvedPrincipal.displayName}
        size={avatarSize}
        square={square}
      />
      <PrincipalDetailsOverlay
        kind={resolvedPrincipal.kind}
        uid={resolvedPrincipal.uid}
        displayName={resolvedPrincipal.displayName}
        name={resolvedPrincipal.name}
        description={resolvedPrincipal.description}
        handle={resolvedPrincipal.handle}
        accountHandle={resolvedPrincipal.accountHandle}
        firstName={resolvedPrincipal.firstName}
        lastName={resolvedPrincipal.lastName}
        email={resolvedPrincipal.email}
        origin={resolvedPrincipal.origin}
        avatarUrl={resolvedPrincipal.avatarUrl}
        isAdmin={isAdmin}
      />
    </Box>
  );
};

export default Principal;
