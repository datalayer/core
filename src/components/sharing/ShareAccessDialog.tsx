/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyIcon,
  PersonIcon,
  OrganizationIcon,
  PeopleIcon,
} from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import {
  ActionList,
  ActionMenu,
  Button,
  Dialog,
  Label,
  Spinner,
  Text,
  TextInput,
} from '@primer/react';
import { useToast } from '../../hooks';
import { useCoreStore, useIAMStore } from '../../state';
import { PrincipalAvatar } from './PrincipalAvatar';
import { PrincipalBadge } from './PrincipalBadge';

// ---------------------------------------------------------------------------
// Public types (do not break callers).
// ---------------------------------------------------------------------------

export type ItemAccessLevel = 'view' | 'update' | 'execute';
type PrincipalKind = 'user' | 'team' | 'organization';

type SharingLevelPayload = {
  userUids?: string[];
  teamUids?: string[];
  organizationUids?: string[];
};

type SharingPayload = {
  access?: Partial<Record<ItemAccessLevel, SharingLevelPayload>>;
};

export type ShareAccessDialogProps = {
  isOpen: boolean;
  requestUrl?: string;
  resourceLabel: string;
  resourceName?: string;
  resourceDescription?: string;
  onSharingAccessRestrictedChange?: (
    restricted: boolean,
    message?: string,
  ) => void;
  defaultAccessLevel?: ItemAccessLevel;
  principalKinds?: readonly PrincipalKind[];
  displayMode?: 'dialog' | 'inline';
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Internal types.
// ---------------------------------------------------------------------------

type AccessByLevel = Record<
  ItemAccessLevel,
  {
    userUids: string[];
    teamUids: string[];
    organizationUids: string[];
  }
>;

type ACLPrincipalEntry = {
  kind: PrincipalKind;
  uid: string;
  levels: ItemAccessLevel[];
};

type OwnerPrincipal = {
  kind: PrincipalKind;
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  origin?: string;
  accountHandle?: string;
};

type ShareablePrincipal = {
  kind: PrincipalKind;
  uid: string;
  handle: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  organizationUid?: string | null;
  organizationHandle?: string | null;
};

type PrincipalSearchItem = {
  kind: PrincipalKind;
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  origin?: string;
  accountHandle?: string;
};

type PrincipalCacheEntry = {
  displayName?: string;
  avatarUrl?: string;
  origin?: string;
  handle?: string;
  accountHandle?: string;
};

type PrincipalCache = Record<string, PrincipalCacheEntry>;

// ---------------------------------------------------------------------------
// Constants.
// ---------------------------------------------------------------------------

const ACCESS_LEVELS: ItemAccessLevel[] = ['view', 'update', 'execute'];
const DEFAULT_PRINCIPAL_KINDS: readonly PrincipalKind[] = [
  'user',
  'team',
  'organization',
];

const ACCESS_LEVEL_LABELS: Record<ItemAccessLevel, string> = {
  view: 'Viewer',
  update: 'Editor',
  execute: 'Executor',
};

// ---------------------------------------------------------------------------
// String / payload helpers.
// ---------------------------------------------------------------------------

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function normalizePrincipalKind(kindRaw?: string): PrincipalKind {
  const kind = (kindRaw || '').trim().toLowerCase();
  if (kind === 'team') {
    return 'team';
  }
  if (kind === 'organization' || kind === 'org') {
    return 'organization';
  }
  return 'user';
}

function toTitleCase(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeUserOrigin(originRaw?: string): string | undefined {
  const value = (originRaw || '').trim();
  if (!value) {
    return undefined;
  }
  const lower = value.toLowerCase();
  if (lower === 'datalayer') {
    return 'Datalayer';
  }
  const extPrefix = 'urn:dla:iam:ext::';
  if (lower.startsWith(extPrefix)) {
    const suffix = value.slice(extPrefix.length);
    const provider = suffix.split(':')[0]?.trim();
    if (!provider) {
      return 'External';
    }
    return toTitleCase(provider.toLowerCase());
  }
  return toTitleCase(lower);
}

function ensurePrincipalDisplayName(
  kind: PrincipalKind,
  ...candidates: Array<string | undefined>
): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return kind === 'organization' ? 'Organization' : 'Principal';
}

function isSharingAuthorizationMessage(message?: string): boolean {
  const normalized = (message || '').trim().toLowerCase();
  return normalized.includes('not authorized');
}

function principalKey(kind: PrincipalKind, uid: string): string {
  return `${kind}:${uid.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Owner extraction (preserves all current fallbacks).
// ---------------------------------------------------------------------------

function extractOwnerPrincipals(payload: any): OwnerPrincipal[] {
  const ownersFromSharing = Array.isArray(payload?.sharing?.owners)
    ? payload.sharing.owners
    : [];
  const ownersFromSpaceField = [
    ...(Array.isArray(payload?.space?.shared_owner_user_uids_ss)
      ? payload.space.shared_owner_user_uids_ss
      : []),
    ...(Array.isArray(payload?.space?.shared_ower_user_uids_ss)
      ? payload.space.shared_ower_user_uids_ss
      : []),
  ];

  const ownerPayload =
    payload?.owner ||
    payload?.data?.owner ||
    payload?.item?.owner ||
    payload?.space?.owner ||
    payload?.notebook?.owner ||
    payload?.lexical?.owner ||
    payload?.document?.owner ||
    payload?.cell?.owner ||
    payload?.resource?.owner ||
    payload?.sharing?.owner ||
    {};

  const ownerUid = pickFirstString(
    ownerPayload?.uid,
    ownerPayload?.owner_uid,
    ownerPayload?.ownerUid,
    ownerPayload?.id,
    payload?.owner_uid,
    payload?.ownerUid,
  );
  const ownerHandle = pickFirstString(
    ownerPayload?.handle_s,
    ownerPayload?.handle,
    ownerPayload?.owner_handle,
    ownerPayload?.ownerHandle,
    payload?.owner_handle,
    payload?.ownerHandle,
  );
  const kindFromOwnerPayload = normalizePrincipalKind(
    pickFirstString(
      ownerPayload?.kind,
      ownerPayload?.type,
      ownerPayload?.principal_kind,
      ownerPayload?.principalKind,
      payload?.owner_kind,
      payload?.ownerKind,
      payload?.owner_type,
      payload?.ownerType,
    ),
  );
  const accountHandle = pickFirstString(
    ownerPayload?.organization_handle_s,
    ownerPayload?.organizationHandle,
    ownerPayload?.organization_handle,
    payload?.space?.organization_handle_s,
    payload?.space?.organizationHandle,
    payload?.space?.organization_handle,
  );
  const firstName = pickFirstString(
    ownerPayload?.first_name_t,
    ownerPayload?.firstName,
  );
  const lastName = pickFirstString(
    ownerPayload?.last_name_t,
    ownerPayload?.lastName,
  );
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName =
    fullName ||
    pickFirstString(
      ownerPayload?.display_name_t,
      ownerPayload?.display_name,
      ownerPayload?.name_t,
      ownerPayload?.name,
      ownerHandle,
      ownerUid,
    );
  const origin = normalizeUserOrigin(
    pickFirstString(
      ownerPayload?.origin,
      ownerPayload?.origin_s,
      ownerPayload?.origin_t,
    ),
  );

  const fallbackOwner =
    ownerUid || ownerHandle
      ? {
          kind: kindFromOwnerPayload,
          uid: ownerUid || ownerHandle,
          handle: ownerHandle || accountHandle || ownerUid,
          displayName,
          avatarUrl:
            pickFirstString(
              ownerPayload?.avatar_url_s,
              ownerPayload?.avatarUrl,
              ownerPayload?.avatar_url,
              payload?.owner_avatar_url,
              payload?.owner_avatar_url_s,
              payload?.ownerAvatarUrl,
            ) || undefined,
          origin,
          accountHandle: accountHandle || undefined,
        }
      : null;

  const ownersFromSharingMapped = ownersFromSharing
    .map((entry: any): OwnerPrincipal | null => {
      if (typeof entry === 'string') {
        const uid = entry.trim();
        return uid
          ? { kind: 'user', uid, handle: uid, displayName: uid }
          : null;
      }
      const uid = pickFirstString(entry?.uid, entry?.owner_uid, entry?.id);
      if (!uid) {
        return null;
      }
      const handle = pickFirstString(entry?.handle_s, entry?.handle, uid);
      const ownerKind = normalizePrincipalKind(
        pickFirstString(entry?.kind, entry?.type, entry?.principal_kind),
      );
      const ownerOrigin = normalizeUserOrigin(
        pickFirstString(entry?.origin, entry?.origin_s, entry?.origin_t),
      );
      const ownerDisplayName =
        pickFirstString(
          entry?.display_name_t,
          entry?.display_name,
          entry?.name_t,
          entry?.name,
          handle,
          uid,
        ) || uid;
      const ownerAvatarUrl =
        pickFirstString(
          entry?.avatar_url_s,
          entry?.avatarUrl,
          entry?.avatar_url,
        ) || undefined;
      return {
        kind: ownerKind,
        uid,
        handle,
        displayName: ownerDisplayName,
        avatarUrl: ownerAvatarUrl,
        origin: ownerOrigin,
        accountHandle:
          pickFirstString(
            entry?.organization_handle_s,
            entry?.organization_handle,
            entry?.organizationHandle,
          ) || undefined,
      };
    })
    .filter(Boolean) as OwnerPrincipal[];

  const ownersFromSpaceMapped = ownersFromSpaceField
    .map((uid: unknown): OwnerPrincipal | null => {
      if (typeof uid !== 'string' || !uid.trim()) {
        return null;
      }
      const normalizedUid = uid.trim();
      return {
        kind: 'user',
        uid: normalizedUid,
        handle: normalizedUid,
        displayName: normalizedUid,
      };
    })
    .filter(Boolean) as OwnerPrincipal[];

  const allOwners = [
    ...ownersFromSharingMapped,
    ...ownersFromSpaceMapped,
    ...(fallbackOwner ? [fallbackOwner] : []),
  ];

  const deduped = new Map<string, OwnerPrincipal>();
  allOwners.forEach(owner => {
    const key = principalKey(owner.kind, owner.uid);
    if (!deduped.has(key)) {
      deduped.set(key, owner);
    }
  });
  return Array.from(deduped.values());
}

// ---------------------------------------------------------------------------
// AccessByLevel helpers.
// ---------------------------------------------------------------------------

function emptyAccessByLevel(): AccessByLevel {
  return {
    view: { userUids: [], teamUids: [], organizationUids: [] },
    update: { userUids: [], teamUids: [], organizationUids: [] },
    execute: { userUids: [], teamUids: [], organizationUids: [] },
  };
}

function bucketFor(
  kind: PrincipalKind,
): 'userUids' | 'teamUids' | 'organizationUids' {
  return kind === 'user'
    ? 'userUids'
    : kind === 'team'
      ? 'teamUids'
      : 'organizationUids';
}

function hasPrincipal(
  state: AccessByLevel,
  level: ItemAccessLevel,
  kind: PrincipalKind,
  uid: string,
): boolean {
  const lower = uid.toLowerCase();
  return state[level][bucketFor(kind)].some(
    value => value.toLowerCase() === lower,
  );
}

function withPrincipalAdded(
  state: AccessByLevel,
  level: ItemAccessLevel,
  kind: PrincipalKind,
  uid: string,
): AccessByLevel {
  if (hasPrincipal(state, level, kind, uid)) {
    return state;
  }
  const bucket = bucketFor(kind);
  return {
    ...state,
    [level]: {
      ...state[level],
      [bucket]: [...state[level][bucket], uid],
    },
  };
}

function withPrincipalRemoved(
  state: AccessByLevel,
  kind: PrincipalKind,
  uid: string,
): AccessByLevel {
  const lower = uid.toLowerCase();
  const bucket = bucketFor(kind);
  const next: AccessByLevel = {
    view: { ...state.view },
    update: { ...state.update },
    execute: { ...state.execute },
  };
  for (const level of ACCESS_LEVELS) {
    next[level][bucket] = next[level][bucket].filter(
      value => value.toLowerCase() !== lower,
    );
  }
  return next;
}

function buildAclEntries(
  state: AccessByLevel,
  principalKinds: readonly PrincipalKind[],
): ACLPrincipalEntry[] {
  const allowed = new Set(principalKinds);
  const byPrincipal = new Map<string, ACLPrincipalEntry>();
  const upsert = (kind: PrincipalKind, uid: string, level: ItemAccessLevel) => {
    if (!allowed.has(kind)) {
      return;
    }
    const key = principalKey(kind, uid);
    const existing = byPrincipal.get(key);
    if (!existing) {
      byPrincipal.set(key, { kind, uid, levels: [level] });
      return;
    }
    if (!existing.levels.includes(level)) {
      existing.levels.push(level);
    }
  };
  for (const level of ACCESS_LEVELS) {
    state[level].userUids.forEach(uid => upsert('user', uid, level));
    state[level].teamUids.forEach(uid => upsert('team', uid, level));
    state[level].organizationUids.forEach(uid =>
      upsert('organization', uid, level),
    );
  }
  return Array.from(byPrincipal.values()).sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind.localeCompare(b.kind);
    }
    return a.uid.localeCompare(b.uid);
  });
}

function hydrateAccessFromSharing(sharing: SharingPayload): AccessByLevel {
  const access = sharing.access || {};
  const view = access.view || {};
  const update = access.update || {};
  const execute = access.execute || {};
  return {
    view: {
      userUids: [...(view.userUids || [])],
      teamUids: [...(view.teamUids || [])],
      organizationUids: [...(view.organizationUids || [])],
    },
    update: {
      userUids: [...(update.userUids || [])],
      teamUids: [...(update.teamUids || [])],
      organizationUids: [...(update.organizationUids || [])],
    },
    execute: {
      userUids: [...(execute.userUids || [])],
      teamUids: [...(execute.teamUids || [])],
      organizationUids: [...(execute.organizationUids || [])],
    },
  };
}

// ---------------------------------------------------------------------------
// Avatar shimmer (used while a user row is being hydrated).
// ---------------------------------------------------------------------------

function AvatarShimmer({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundImage:
          'linear-gradient(90deg, var(--bgColor-muted, #d0d7de) 25%, var(--bgColor-default, #ffffff) 50%, var(--bgColor-muted, #d0d7de) 75%)',
        backgroundSize: '220% 100%',
        animation: 'avatarShimmerAcl 1.2s ease-in-out infinite',
        '@keyframes avatarShimmerAcl': {
          '0%': { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Row components.
// ---------------------------------------------------------------------------

type OwnerPrincipalRowProps = {
  ownerPrincipal: OwnerPrincipal;
  cache: PrincipalCache;
  showAvatarSkeleton?: boolean;
  isPlatformAdmin: boolean;
};

function OwnerPrincipalRow({
  ownerPrincipal,
  cache,
  showAvatarSkeleton = false,
  isPlatformAdmin,
}: OwnerPrincipalRowProps): JSX.Element {
  const entry =
    cache[principalKey(ownerPrincipal.kind, ownerPrincipal.uid)] || {};
  const cachedHandle = entry.handle;
  const safeCachedHandle =
    cachedHandle && cachedHandle !== ownerPrincipal.uid ? cachedHandle : '';
  const safeOwnerHandle =
    ownerPrincipal.handle && ownerPrincipal.handle !== ownerPrincipal.uid
      ? ownerPrincipal.handle
      : '';
  const resolvedHandle =
    safeCachedHandle || safeOwnerHandle || ownerPrincipal.accountHandle;
  const resolvedAccountHandle =
    entry.accountHandle || ownerPrincipal.accountHandle;
  const resolvedDisplayName = ensurePrincipalDisplayName(
    ownerPrincipal.kind,
    ownerPrincipal.displayName,
    entry.displayName,
    resolvedHandle,
    ownerPrincipal.handle,
    ownerPrincipal.accountHandle,
    ownerPrincipal.uid,
  );
  const resolvedAvatarUrl = ownerPrincipal.avatarUrl || entry.avatarUrl;
  const resolvedOrigin =
    ownerPrincipal.origin ||
    entry.origin ||
    (ownerPrincipal.kind === 'user' ? 'Datalayer' : undefined);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      {showAvatarSkeleton ? (
        <>
          <AvatarShimmer size={20} />
          <Text sx={{ fontWeight: 'semibold' }}>{resolvedDisplayName}</Text>
        </>
      ) : (
        <PrincipalBadge
          principal={{
            kind: ownerPrincipal.kind,
            uid: ownerPrincipal.uid,
            displayName: resolvedDisplayName,
            handle: resolvedHandle,
            accountHandle: resolvedAccountHandle,
            avatarUrl: resolvedAvatarUrl,
            origin: resolvedOrigin,
          }}
          showPrincipalLabel={false}
          showApplyingToText={false}
          showOriginLabel={ownerPrincipal.kind === 'user'}
          isAdmin={isPlatformAdmin}
          sx={{ px: 0, py: 0, border: 'none', bg: 'transparent' }}
        />
      )}
    </Box>
  );
}

type AccessPrincipalRowProps = {
  entry: ACLPrincipalEntry;
  cache: PrincipalCache;
  showAvatarSkeleton?: boolean;
  isPlatformAdmin: boolean;
};

function AccessPrincipalRow({
  entry,
  cache,
  showAvatarSkeleton = false,
  isPlatformAdmin,
}: AccessPrincipalRowProps): JSX.Element {
  const cached = cache[principalKey(entry.kind, entry.uid)] || {};
  const cachedHandle = cached.handle;
  const safeCachedHandle =
    cachedHandle && cachedHandle !== entry.uid ? cachedHandle : '';
  const resolvedHandle = safeCachedHandle || cached.accountHandle;
  const resolvedDisplayName = ensurePrincipalDisplayName(
    entry.kind,
    cached.displayName,
    resolvedHandle,
    entry.uid,
  );

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      {showAvatarSkeleton ? (
        <>
          <AvatarShimmer size={20} />
          <Text>{resolvedDisplayName}</Text>
        </>
      ) : (
        <PrincipalBadge
          principal={{
            kind: entry.kind,
            uid: entry.uid,
            displayName: resolvedDisplayName,
            handle: resolvedHandle,
            accountHandle: cached.accountHandle,
            avatarUrl: cached.avatarUrl,
            origin: cached.origin || 'Datalayer',
          }}
          showPrincipalLabel={false}
          showApplyingToText={false}
          showOriginLabel={entry.kind === 'user'}
          isAdmin={isPlatformAdmin}
          sx={{ px: 0, py: 0, border: 'none', bg: 'transparent' }}
        />
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component.
// ---------------------------------------------------------------------------

export function ShareAccessDialog({
  isOpen,
  requestUrl,
  resourceLabel,
  resourceName,
  resourceDescription: _resourceDescription,
  onSharingAccessRestrictedChange,
  defaultAccessLevel = 'view',
  principalKinds = DEFAULT_PRINCIPAL_KINDS,
  displayMode = 'dialog',
  onClose,
}: ShareAccessDialogProps): JSX.Element | null {
  void _resourceDescription;
  const { token, user } = useIAMStore();
  const { configuration } = useCoreStore();
  const { enqueueToast } = useToast();
  const isPlatformAdmin = Boolean(
    Array.isArray(user?.roles) && user.roles.includes('platform_admin'),
  );

  // ----- State -----
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAccessLevel, setSelectedAccessLevel] =
    useState<ItemAccessLevel>(defaultAccessLevel);

  const [access, setAccess] = useState<AccessByLevel>(emptyAccessByLevel());
  const [ownerPrincipals, setOwnerPrincipals] = useState<OwnerPrincipal[]>([]);
  const [shareablePrincipals, setShareablePrincipals] = useState<
    ShareablePrincipal[]
  >([]);
  const [isLoadingShareable, setIsLoadingShareable] = useState(false);

  const [principalCache, setPrincipalCache] = useState<PrincipalCache>({});
  const [hydratingUserUids, setHydratingUserUids] = useState<
    Record<string, true>
  >({});

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PrincipalSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  const [sharingAccessMessage, setSharingAccessMessage] = useState<
    string | null
  >(null);
  const [isSharingAccessConfirmed, setIsSharingAccessConfirmed] =
    useState(false);

  // ----- Refs -----
  const hasLoadedForOpenRef = useRef(false);
  const hasHydratedSharingRef = useRef(false);
  const lastSavedSharingRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSearchRequestRef = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const userHydrationMissesRef = useRef<Set<string>>(new Set());
  const enqueueToastRef = useRef(enqueueToast);

  useEffect(() => {
    enqueueToastRef.current = enqueueToast;
  }, [enqueueToast]);

  // ----- Notify caller about restricted access state -----
  useEffect(() => {
    if (!onSharingAccessRestrictedChange) {
      return;
    }
    const restricted =
      !isSharingAccessConfirmed || Boolean(sharingAccessMessage);
    onSharingAccessRestrictedChange(
      restricted,
      sharingAccessMessage || undefined,
    );
  }, [
    isSharingAccessConfirmed,
    sharingAccessMessage,
    onSharingAccessRestrictedChange,
  ]);

  // ----- Derived -----
  const canRequest = Boolean(requestUrl && token);
  const canSearchPrincipals = Boolean(configuration?.iamRunUrl && token);
  const iamRunUrl = configuration?.iamRunUrl;

  const principalKindsSet = useMemo(
    () => new Set(principalKinds),
    [principalKinds],
  );
  const principalKindsKey = useMemo(
    () => [...principalKinds].sort().join('|'),
    [principalKinds],
  );

  const aclEntries = useMemo(
    () => buildAclEntries(access, principalKinds),
    [access, principalKinds],
  );

  const normalizedSearch = searchQuery.trim();
  const normalizedDebouncedSearch = debouncedSearchQuery.trim();
  const canShowSearchResults =
    isSearchOverlayOpen && normalizedSearch.length > 0;

  // ----- Cache mutators (single consolidated record) -----
  const mergePrincipalCacheEntry = useCallback(
    (kind: PrincipalKind, uid: string, patch: PrincipalCacheEntry) => {
      if (!uid) {
        return;
      }
      const key = principalKey(kind, uid);
      setPrincipalCache(prev => {
        const existing = prev[key] || {};
        const merged: PrincipalCacheEntry = { ...existing };
        let changed = false;
        (Object.keys(patch) as Array<keyof PrincipalCacheEntry>).forEach(
          field => {
            const value = patch[field];
            if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed && existing[field] !== trimmed) {
                merged[field] = trimmed;
                changed = true;
              }
            }
          },
        );
        return changed ? { ...prev, [key]: merged } : prev;
      });
    },
    [],
  );

  // ----- Reset on close / load on open -----
  useEffect(() => {
    if (isOpen) {
      setSelectedAccessLevel(defaultAccessLevel);
    }
  }, [isOpen, defaultAccessLevel]);

  useEffect(() => {
    if (!isOpen) {
      hasLoadedForOpenRef.current = false;
      hasHydratedSharingRef.current = false;
      lastSavedSharingRef.current = null;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setSearchQuery('');
      setIsSearchOverlayOpen(false);
      setSearchResults([]);
      setIsSearching(false);
      setSharingAccessMessage(null);
      setIsSharingAccessConfirmed(false);
      setPrincipalCache({});
      setOwnerPrincipals([]);
      setShareablePrincipals([]);
      setHydratingUserUids({});
      userHydrationMissesRef.current = new Set();
      return;
    }

    if (!canRequest || !requestUrl) {
      setIsLoading(false);
      setIsSharingAccessConfirmed(false);
      return;
    }

    if (hasLoadedForOpenRef.current) {
      return;
    }
    hasLoadedForOpenRef.current = true;

    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setIsSharingAccessConfirmed(false);
      setSharingAccessMessage(null);
      try {
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json();
        const message =
          payload?.detail ||
          payload?.message ||
          `Unable to load ${resourceLabel.toLowerCase()} sharing.`;

        if (payload?.success === false) {
          if (!cancelled && isSharingAuthorizationMessage(message)) {
            setSharingAccessMessage(message);
            setIsSharingAccessConfirmed(true);
            setAccess(emptyAccessByLevel());
            setOwnerPrincipals([]);
            return;
          }
          throw new Error(message);
        }
        if (!response.ok) {
          if (
            response.status === 403 ||
            isSharingAuthorizationMessage(message)
          ) {
            if (!cancelled) {
              setSharingAccessMessage(message);
              setIsSharingAccessConfirmed(true);
              setAccess(emptyAccessByLevel());
              setOwnerPrincipals([]);
            }
            return;
          }
          throw new Error(message);
        }
        if (cancelled) {
          return;
        }

        const sharing = (payload?.sharing || {}) as SharingPayload;
        const owners = extractOwnerPrincipals(payload);
        const hydrated = hydrateAccessFromSharing(sharing);

        setOwnerPrincipals(owners);
        owners.forEach(owner => {
          mergePrincipalCacheEntry(owner.kind, owner.uid, {
            displayName: owner.displayName || owner.handle || owner.uid,
            handle: owner.handle || owner.uid,
            avatarUrl: owner.avatarUrl,
            accountHandle: owner.accountHandle,
            origin: owner.kind === 'user' ? owner.origin : undefined,
          });
        });
        setAccess(hydrated);
        lastSavedSharingRef.current = JSON.stringify(hydrated);
        hasHydratedSharingRef.current = true;
        setIsSharingAccessConfirmed(true);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : `Unable to load ${resourceLabel.toLowerCase()} sharing.`;
        enqueueToastRef.current(message, { variant: 'error' });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    canRequest,
    requestUrl,
    token,
    resourceLabel,
    resourceName,
    mergePrincipalCacheEntry,
  ]);

  // ----- Fetch shareable principals on open -----
  useEffect(() => {
    if (!isOpen || !canSearchPrincipals || !iamRunUrl || !token) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setIsLoadingShareable(true);
      try {
        const response = await fetch(
          `${iamRunUrl}/api/iam/v1/principals/shareable`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const payload = await response.json();
        if (!response.ok || payload?.success === false) {
          const message =
            payload?.detail ||
            payload?.message ||
            'Unable to load shareable principals.';
          throw new Error(message);
        }
        if (cancelled) {
          return;
        }
        const raw = Array.isArray(payload?.principals)
          ? payload.principals
          : [];
        const mapped: ShareablePrincipal[] = raw
          .map((entry: any): ShareablePrincipal | null => {
            const uid = pickFirstString(entry?.uid);
            const handle = pickFirstString(entry?.handle, entry?.handle_s);
            if (!uid) {
              return null;
            }
            const kind = normalizePrincipalKind(pickFirstString(entry?.kind));
            return {
              kind,
              uid,
              handle: handle || uid,
              name: pickFirstString(entry?.name) || null,
              email: pickFirstString(entry?.email) || null,
              avatarUrl:
                pickFirstString(entry?.avatar_url, entry?.avatarUrl) || null,
              organizationUid:
                pickFirstString(
                  entry?.organization_uid,
                  entry?.organizationUid,
                ) || null,
              organizationHandle:
                pickFirstString(
                  entry?.organization_handle,
                  entry?.organizationHandle,
                ) || null,
            };
          })
          .filter(Boolean) as ShareablePrincipal[];
        setShareablePrincipals(mapped);
        mapped.forEach(principal => {
          mergePrincipalCacheEntry(principal.kind, principal.uid, {
            displayName: principal.name || principal.handle,
            handle: principal.handle,
            avatarUrl: principal.avatarUrl || undefined,
            accountHandle: principal.organizationHandle || undefined,
            origin: principal.kind === 'user' ? 'Datalayer' : undefined,
          });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load shareable principals.';
        enqueueToastRef.current(message, { variant: 'error' });
      } finally {
        if (!cancelled) {
          setIsLoadingShareable(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, canSearchPrincipals, iamRunUrl, token, mergePrincipalCacheEntry]);

  // ----- Debounce search query -----
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  // ----- Run search against /principals/search -----
  useEffect(() => {
    if (!isOpen || !canSearchPrincipals || !iamRunUrl || !token) {
      setSearchResults([]);
      return;
    }
    const query = normalizedDebouncedSearch;
    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    const requestId = activeSearchRequestRef.current + 1;
    activeSearchRequestRef.current = requestId;
    const run = async () => {
      setIsSearching(true);
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);
        let response: Response;
        let payload: any;
        try {
          response = await fetch(`${iamRunUrl}/api/iam/v1/principals/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              query,
              principalTypes: [...principalKinds],
            }),
            signal: controller.signal,
          });
          payload = await response.json();
        } finally {
          window.clearTimeout(timeoutId);
        }
        if (requestId !== activeSearchRequestRef.current || cancelled) {
          return;
        }
        if (!response.ok || !payload?.success) {
          const message =
            payload?.detail ||
            payload?.message ||
            'Unable to search principals.';
          throw new Error(message);
        }
        const data =
          payload?.data && typeof payload.data === 'object'
            ? payload.data
            : payload;
        const users: any[] = Array.isArray(data?.users) ? data.users : [];
        const teams: any[] = Array.isArray(data?.teams) ? data.teams : [];
        const organizations: any[] = Array.isArray(data?.organizations)
          ? data.organizations
          : [];

        const mappedUsers: PrincipalSearchItem[] = users
          .map((entry: any): PrincipalSearchItem | null => {
            const uid = pickFirstString(entry?.uid);
            const handle = pickFirstString(entry?.handle_s, entry?.handle);
            if (!uid) {
              return null;
            }
            const firstName = pickFirstString(
              entry?.first_name_t,
              entry?.firstName,
            );
            const lastName = pickFirstString(
              entry?.last_name_t,
              entry?.lastName,
            );
            const displayName =
              `${firstName} ${lastName}`.trim() ||
              pickFirstString(
                entry?.display_name_t,
                entry?.display_name,
                handle,
              );
            const origin = normalizeUserOrigin(
              pickFirstString(entry?.origin, entry?.origin_s, entry?.origin_t),
            );
            const avatarUrl = pickFirstString(
              entry?.avatar_url_s,
              entry?.avatarUrl,
              entry?.avatar_url,
            );
            return {
              kind: 'user',
              uid,
              handle: handle || uid,
              displayName: displayName || handle || uid,
              avatarUrl: avatarUrl || undefined,
              origin,
            };
          })
          .filter(Boolean) as PrincipalSearchItem[];

        const mappedTeams: PrincipalSearchItem[] = teams
          .map((entry: any): PrincipalSearchItem | null => {
            const uid = pickFirstString(entry?.uid);
            const handle = pickFirstString(entry?.handle_s, entry?.handle);
            if (!uid) {
              return null;
            }
            return {
              kind: 'team',
              uid,
              handle: handle || uid,
              displayName:
                pickFirstString(entry?.name_t, entry?.name) || handle || uid,
              accountHandle:
                pickFirstString(
                  entry?.organization_handle_s,
                  entry?.organizationHandle,
                  entry?.organization_handle,
                ) || undefined,
            };
          })
          .filter(Boolean) as PrincipalSearchItem[];

        const mappedOrganizations: PrincipalSearchItem[] = organizations
          .map((entry: any): PrincipalSearchItem | null => {
            const uid = pickFirstString(entry?.uid);
            const handle = pickFirstString(entry?.handle_s, entry?.handle);
            if (!uid) {
              return null;
            }
            return {
              kind: 'organization',
              uid,
              handle: handle || uid,
              displayName:
                pickFirstString(entry?.name_t, entry?.name) || handle || uid,
            };
          })
          .filter(Boolean) as PrincipalSearchItem[];

        const filtered = [
          ...mappedUsers,
          ...mappedTeams,
          ...mappedOrganizations,
        ].filter(result => principalKindsSet.has(result.kind));

        filtered.forEach(result => {
          mergePrincipalCacheEntry(result.kind, result.uid, {
            displayName: result.displayName || result.handle,
            handle: result.handle,
            avatarUrl: result.avatarUrl,
            accountHandle: result.accountHandle,
            origin: result.kind === 'user' ? result.origin : undefined,
          });
        });

        setSearchResults(filtered);
      } catch (error) {
        if (cancelled || requestId !== activeSearchRequestRef.current) {
          return;
        }
        setSearchResults([]);
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to search principals.';
        enqueueToastRef.current(message, { variant: 'error' });
      } finally {
        if (requestId === activeSearchRequestRef.current && !cancelled) {
          setIsSearching(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    canSearchPrincipals,
    iamRunUrl,
    token,
    normalizedDebouncedSearch,
    principalKindsKey,
    principalKinds,
    principalKindsSet,
    mergePrincipalCacheEntry,
  ]);

  // ----- Hydrate ACL user uids in bulk -----
  useEffect(() => {
    if (!isOpen || !canSearchPrincipals || !iamRunUrl || !token) {
      return;
    }
    const userUids = Array.from(
      new Set([
        ...aclEntries
          .filter(e => e.kind === 'user')
          .map(e => e.uid)
          .filter(Boolean),
        ...ownerPrincipals
          .filter(o => o.kind === 'user')
          .map(o => o.uid)
          .filter(Boolean),
      ]),
    );
    const unknown = userUids.filter(uid => {
      if (!uid || userHydrationMissesRef.current.has(uid)) {
        return false;
      }
      const cached = principalCache[principalKey('user', uid)] || {};
      return (
        !cached.displayName ||
        !cached.avatarUrl ||
        !cached.origin ||
        !cached.handle
      );
    });
    if (unknown.length === 0) {
      setHydratingUserUids({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      setHydratingUserUids(
        unknown.reduce(
          (acc, uid) => {
            acc[uid] = true;
            return acc;
          },
          {} as Record<string, true>,
        ),
      );
      try {
        const response = await fetch(`${iamRunUrl}/api/iam/v1/users/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userIds: unknown }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success || cancelled) {
          unknown.forEach(uid => userHydrationMissesRef.current.add(uid));
          return;
        }
        const data =
          payload?.data && typeof payload.data === 'object'
            ? payload.data
            : payload;
        const users: any[] = Array.isArray(data?.users) ? data.users : [];
        const hydratedSet = new Set<string>();
        users.forEach((entry: any) => {
          const uid = pickFirstString(entry?.uid);
          if (!uid) {
            return;
          }
          hydratedSet.add(uid);
          const handle = pickFirstString(entry?.handle_s, entry?.handle) || uid;
          const firstName = pickFirstString(
            entry?.first_name_t,
            entry?.firstName,
          );
          const lastName = pickFirstString(entry?.last_name_t, entry?.lastName);
          const displayName =
            `${firstName} ${lastName}`.trim() ||
            pickFirstString(entry?.display_name_t, entry?.display_name) ||
            handle;
          const avatarUrl = pickFirstString(
            entry?.avatar_url_s,
            entry?.avatarUrl,
            entry?.avatar_url,
          );
          const origin = normalizeUserOrigin(
            pickFirstString(entry?.origin, entry?.origin_s, entry?.origin_t),
          );
          mergePrincipalCacheEntry('user', uid, {
            displayName,
            handle,
            avatarUrl: avatarUrl || undefined,
            origin,
          });
        });
        unknown.forEach(uid => {
          if (!hydratedSet.has(uid)) {
            userHydrationMissesRef.current.add(uid);
          }
        });
      } catch {
        unknown.forEach(uid => userHydrationMissesRef.current.add(uid));
      } finally {
        if (!cancelled) {
          setHydratingUserUids({});
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    canSearchPrincipals,
    iamRunUrl,
    token,
    aclEntries,
    ownerPrincipals,
    principalCache,
    mergePrincipalCacheEntry,
  ]);

  // ----- Hydrate ACL team uids individually -----
  useEffect(() => {
    if (!isOpen || !canSearchPrincipals || !iamRunUrl || !token) {
      return;
    }
    const unknownTeams = aclEntries.filter(entry => {
      if (entry.kind !== 'team') {
        return false;
      }
      const cached = principalCache[principalKey('team', entry.uid)] || {};
      return !cached.displayName;
    });
    if (unknownTeams.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.all(
      unknownTeams.map(async entry => {
        try {
          const response = await fetch(
            `${iamRunUrl}/api/iam/v1/teams/${encodeURIComponent(entry.uid)}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            },
          );
          const payload = await response.json();
          if (!response.ok || !payload?.success || cancelled) {
            return;
          }
          const data =
            payload?.data && typeof payload.data === 'object'
              ? payload.data
              : payload;
          const obj = data?.team || data;
          const name = pickFirstString(obj?.name_t, obj?.name);
          const handle = pickFirstString(obj?.handle_s, obj?.handle);
          const accountHandle = pickFirstString(
            obj?.organization_handle_s,
            obj?.organizationHandle,
            obj?.organization_handle,
          );
          mergePrincipalCacheEntry('team', entry.uid, {
            displayName: name || handle,
            handle,
            accountHandle,
          });
        } catch {
          // Best effort.
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    canSearchPrincipals,
    iamRunUrl,
    token,
    aclEntries,
    principalCache,
    mergePrincipalCacheEntry,
  ]);

  // ----- Auto-save on access change after hydration -----
  const saveAccess = useCallback(
    async (snapshot: AccessByLevel) => {
      if (!canRequest || !requestUrl) {
        return;
      }
      setIsSaving(true);
      try {
        const body: SharingPayload = {
          access: {
            view: {
              userUids: snapshot.view.userUids,
              teamUids: snapshot.view.teamUids,
              organizationUids: snapshot.view.organizationUids,
            },
            update: {
              userUids: snapshot.update.userUids,
              teamUids: snapshot.update.teamUids,
              organizationUids: snapshot.update.organizationUids,
            },
            execute: {
              userUids: snapshot.execute.userUids,
              teamUids: snapshot.execute.teamUids,
              organizationUids: snapshot.execute.organizationUids,
            },
          },
        };
        const response = await fetch(requestUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const payload = await response.json();
        const message =
          payload?.detail ||
          payload?.message ||
          `Unable to update ${resourceLabel.toLowerCase()} sharing.`;
        if (payload?.success === false) {
          if (isSharingAuthorizationMessage(message)) {
            setSharingAccessMessage(message);
            return;
          }
          throw new Error(message);
        }
        if (!response.ok) {
          if (
            response.status === 403 ||
            isSharingAuthorizationMessage(message)
          ) {
            setSharingAccessMessage(message);
            return;
          }
          throw new Error(message);
        }
        enqueueToastRef.current(`${resourceLabel} sharing updated.`, {
          variant: 'success',
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Unable to update ${resourceLabel.toLowerCase()} sharing.`;
        enqueueToastRef.current(message, { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [canRequest, requestUrl, token, resourceLabel],
  );

  useEffect(() => {
    if (!hasHydratedSharingRef.current) {
      return;
    }
    if (!canRequest || !requestUrl) {
      return;
    }
    if (!isSharingAccessConfirmed || sharingAccessMessage) {
      return;
    }
    const serialized = JSON.stringify(access);
    if (lastSavedSharingRef.current === serialized) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      lastSavedSharingRef.current = serialized;
      void saveAccess(access);
    }, 400);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    access,
    canRequest,
    requestUrl,
    isSharingAccessConfirmed,
    sharingAccessMessage,
    saveAccess,
  ]);

  // ----- Action handlers -----
  const addPrincipal = useCallback(
    (kind: PrincipalKind, uid: string) => {
      if (!principalKindsSet.has(kind)) {
        return;
      }
      setAccess(prev =>
        withPrincipalAdded(prev, selectedAccessLevel, kind, uid),
      );
    },
    [principalKindsSet, selectedAccessLevel],
  );

  const removePrincipal = useCallback((kind: PrincipalKind, uid: string) => {
    setAccess(prev => withPrincipalRemoved(prev, kind, uid));
  }, []);

  const handleSearchResultSelect = useCallback(
    (result: PrincipalSearchItem) => {
      addPrincipal(result.kind, result.uid);
      setSearchQuery('');
      setIsSearchOverlayOpen(false);
      setSearchResults([]);
    },
    [addPrincipal],
  );

  // ----- Search overlay outside-click + escape -----
  useEffect(() => {
    if (!isSearchOverlayOpen) {
      return;
    }
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && searchContainerRef.current?.contains(target)) {
        return;
      }
      setIsSearchOverlayOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      setIsSearchOverlayOpen(false);
      searchInputRef.current?.focus();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOverlayOpen]);

  // ----- Shareable picker groupings -----
  const groupedShareable = useMemo(() => {
    const filtered = shareablePrincipals.filter(p =>
      principalKindsSet.has(p.kind),
    );
    const selfUid = pickFirstString(user?.uid);
    const self = filtered.filter(p => p.kind === 'user' && p.uid === selfUid);
    const otherUsers = filtered.filter(
      p => p.kind === 'user' && p.uid !== selfUid,
    );
    const orgs = filtered.filter(p => p.kind === 'organization');
    const teams = filtered.filter(p => p.kind === 'team');
    return { self, otherUsers, orgs, teams };
  }, [shareablePrincipals, principalKindsSet, user?.uid]);

  if (!isOpen) {
    return null;
  }

  const isReadOnly =
    !canRequest ||
    !isSharingAccessConfirmed ||
    isLoading ||
    Boolean(sharingAccessMessage);

  // ----- Sub-renderers (kept inline for locality) -----
  const renderShareablePrincipalRow = (principal: ShareablePrincipal) => {
    const alreadyAdded = hasPrincipal(
      access,
      selectedAccessLevel,
      principal.kind,
      principal.uid,
    );
    const cached =
      principalCache[principalKey(principal.kind, principal.uid)] || {};
    const displayName =
      principal.name || cached.displayName || principal.handle || principal.uid;
    const Icon =
      principal.kind === 'user'
        ? PersonIcon
        : principal.kind === 'organization'
          ? OrganizationIcon
          : PeopleIcon;
    return (
      <Box
        key={principalKey(principal.kind, principal.uid)}
        as="button"
        type="button"
        onClick={() => {
          if (!alreadyAdded) {
            addPrincipal(principal.kind, principal.uid);
          }
        }}
        disabled={alreadyAdded || isSaving || isReadOnly}
        sx={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2,
          py: 2,
          cursor:
            alreadyAdded || isSaving || isReadOnly ? 'not-allowed' : 'pointer',
          opacity: alreadyAdded ? 0.55 : 1,
          borderRadius: 2,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'border.default',
          bg: 'canvas.default',
          ':hover': {
            bg:
              alreadyAdded || isSaving || isReadOnly
                ? 'canvas.default'
                : 'canvas.subtle',
          },
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            minWidth: 0,
          }}
        >
          <PrincipalAvatar
            kind={principal.kind}
            avatarUrl={principal.avatarUrl || undefined}
            alt={displayName}
            size={22}
          />
          <Box sx={{ display: 'grid', minWidth: 0 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Text sx={{ fontWeight: 'semibold' }}>{displayName}</Text>
              {principal.kind === 'user' &&
                user?.uid &&
                principal.uid === user.uid && (
                  <Label size="small" variant="accent">
                    You
                  </Label>
                )}
            </Box>
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
              @{principal.handle}
              {principal.kind === 'team' && principal.organizationHandle && (
                <Text as="span" sx={{ color: 'fg.muted' }}>
                  {' · '}org @{principal.organizationHandle}
                </Text>
              )}
            </Text>
          </Box>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <Icon size={14} />
          {alreadyAdded ? (
            <Label size="small" variant="success">
              Added
            </Label>
          ) : (
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Add</Text>
          )}
        </Box>
      </Box>
    );
  };

  const renderShareableGroup = (
    label: string,
    items: ShareablePrincipal[],
  ): JSX.Element | null => {
    if (items.length === 0) {
      return null;
    }
    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Text
          sx={{
            fontSize: 0,
            color: 'fg.muted',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Text>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {items.map(renderShareablePrincipalRow)}
        </Box>
      </Box>
    );
  };

  const content = (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {sharingAccessMessage && (
        <Box
          sx={{
            px: 3,
            py: 3,
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'attention.muted',
            bg: 'attention.subtle',
            display: 'grid',
            gap: 1,
          }}
        >
          <Text sx={{ fontWeight: 600 }}>Sharing access is restricted</Text>
          <Text sx={{ color: 'fg.muted' }}>{sharingAccessMessage}</Text>
        </Box>
      )}

      <Box
        sx={{
          opacity: isReadOnly ? 0.6 : 1,
          pointerEvents: isReadOnly ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
        aria-disabled={isReadOnly}
      >
        {/* Header: resource info + level selector */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'border.default',
            bg: 'canvas.subtle',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
              Share {resourceName || `this ${resourceLabel.toLowerCase()}`}.
              Pick a principal below — they will be granted the selected access
              level.
            </Text>
          </Box>
          <ActionMenu>
            <ActionMenu.Anchor>
              <Button
                variant="default"
                size="small"
                leadingVisual={KeyIcon}
                disabled={isSaving || isReadOnly}
              >
                Access: {ACCESS_LEVEL_LABELS[selectedAccessLevel]}
              </Button>
            </ActionMenu.Anchor>
            <ActionMenu.Overlay width="small">
              <ActionList selectionVariant="single">
                {ACCESS_LEVELS.map(level => (
                  <ActionList.Item
                    key={level}
                    selected={selectedAccessLevel === level}
                    onSelect={() => setSelectedAccessLevel(level)}
                  >
                    {ACCESS_LEVEL_LABELS[level]}
                  </ActionList.Item>
                ))}
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </Box>

        {/* Owner */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'border.default',
            bg: 'canvas.default',
            display: 'grid',
            gap: 1,
          }}
        >
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Owner</Text>
          {ownerPrincipals.length > 0 ? (
            <Box sx={{ display: 'grid' }}>
              {ownerPrincipals.map((ownerPrincipal, index) => (
                <Box
                  key={principalKey(ownerPrincipal.kind, ownerPrincipal.uid)}
                  sx={{
                    py: 1,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopStyle: 'solid',
                    borderColor: 'border.subtle',
                  }}
                >
                  <OwnerPrincipalRow
                    ownerPrincipal={ownerPrincipal}
                    cache={principalCache}
                    showAvatarSkeleton={
                      ownerPrincipal.kind === 'user' &&
                      Boolean(hydratingUserUids[ownerPrincipal.uid])
                    }
                    isPlatformAdmin={isPlatformAdmin}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
              Owner information is not available.
            </Text>
          )}
        </Box>

        {/* Share with… (shareable principals picker — PROMINENT) */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'border.default',
            bg: 'canvas.default',
            display: 'grid',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Text sx={{ fontSize: 1, fontWeight: 600 }}>Share with…</Text>
            {isLoadingShareable && (
              <Box
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
              >
                <Spinner size="small" />
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Loading…</Text>
              </Box>
            )}
          </Box>
          {!isLoadingShareable &&
          groupedShareable.self.length === 0 &&
          groupedShareable.otherUsers.length === 0 &&
          groupedShareable.orgs.length === 0 &&
          groupedShareable.teams.length === 0 ? (
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
              No principals available to share with.
            </Text>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {renderShareableGroup('You', groupedShareable.self)}
              {renderShareableGroup('Other users', groupedShareable.otherUsers)}
              {renderShareableGroup(
                'Your organizations',
                groupedShareable.orgs,
              )}
              {renderShareableGroup('Your teams', groupedShareable.teams)}
            </Box>
          )}
        </Box>

        {/* Secondary advanced search */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'border.subtle',
            bg: 'canvas.subtle',
            display: 'grid',
            gap: 1,
          }}
        >
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            Or search for any user, team, or organization
          </Text>
          <Box sx={{ position: 'relative' }} ref={searchContainerRef}>
            <TextInput
              ref={searchInputRef}
              block
              value={searchQuery}
              onChange={e => {
                const next = e.target.value;
                setSearchQuery(next);
                setIsSearchOverlayOpen(next.trim().length > 0);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setIsSearchOverlayOpen(true);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsSearchOverlayOpen(false);
                }
              }}
              placeholder="Search by handle, name, or email"
              aria-label="Search principals"
              disabled={isSaving}
            />
            {canShowSearchResults && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  maxHeight: '220px',
                  overflowY: 'auto',
                  bg: 'canvas.overlay',
                  boxShadow: 'shadow.medium',
                }}
              >
                {isSearching ? (
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Spinner size="small" />
                    <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                      Searching…
                    </Text>
                  </Box>
                ) : searchResults.length === 0 ? (
                  <Box sx={{ px: 3, py: 2 }}>
                    <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                      No principals found.
                    </Text>
                  </Box>
                ) : (
                  <ActionList>
                    {searchResults.map(result => (
                      <ActionList.Item
                        key={principalKey(result.kind, result.uid)}
                        onSelect={() => handleSearchResultSelect(result)}
                      >
                        <ActionList.LeadingVisual>
                          <PrincipalAvatar
                            kind={result.kind}
                            avatarUrl={result.avatarUrl}
                            alt={result.displayName}
                            size={18}
                          />
                        </ActionList.LeadingVisual>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Text>{result.displayName}</Text>
                          {result.kind === 'user' && (
                            <Label size="small" variant="secondary">
                              {result.origin ||
                                principalCache[principalKey('user', result.uid)]
                                  ?.origin ||
                                'Datalayer'}
                            </Label>
                          )}
                        </Box>
                        <ActionList.Description variant="block">
                          @{result.handle}
                        </ActionList.Description>
                      </ActionList.Item>
                    ))}
                  </ActionList>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* ACL list */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderRadius: 2,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'border.default',
            bg: 'canvas.default',
            display: 'grid',
            gap: 1,
          }}
        >
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
            Access Control List (ACL)
          </Text>
          <Box
            sx={{
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'border.default',
              borderRadius: 2,
              maxHeight: '220px',
              overflowY: 'auto',
              bg: 'canvas.subtle',
            }}
          >
            {aclEntries.length === 0 ? (
              <Box sx={{ px: 3, py: 2 }}>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                  No principals shared yet.
                </Text>
              </Box>
            ) : (
              <Box sx={{ display: 'grid' }}>
                {aclEntries.map(entry => (
                  <Box
                    key={principalKey(entry.kind, entry.uid)}
                    sx={{
                      px: 3,
                      py: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      borderTopWidth: 1,
                      borderTopStyle: 'solid',
                      borderColor: 'border.subtle',
                      '&:first-of-type': { borderTop: 'none' },
                    }}
                  >
                    <AccessPrincipalRow
                      entry={entry}
                      cache={principalCache}
                      showAvatarSkeleton={
                        entry.kind === 'user' &&
                        Boolean(hydratingUserUids[entry.uid])
                      }
                      isPlatformAdmin={isPlatformAdmin}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        justifyContent: 'flex-end',
                      }}
                    >
                      {entry.levels.map(level => (
                        <Label key={level} size="small" variant="secondary">
                          {ACCESS_LEVEL_LABELS[level]}
                        </Label>
                      ))}
                    </Box>
                    <Button
                      size="small"
                      variant="invisible"
                      onClick={() => removePrincipal(entry.kind, entry.uid)}
                      disabled={isSaving}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {isSaving && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Spinner size="small" />
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Saving…</Text>
          </Box>
        )}
        {displayMode === 'dialog' && (
          <Button onClick={onClose} disabled={isSaving}>
            Close
          </Button>
        )}
      </Box>

      {isLoading && (
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          Loading current sharing settings…
        </Text>
      )}
    </Box>
  );

  if (displayMode === 'inline') {
    return (
      <Box
        sx={{
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'border.default',
          borderRadius: 2,
          bg: 'canvas.default',
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Dialog
      title={`Share ${resourceLabel.toLowerCase()}`}
      onClose={onClose}
      width="large"
    >
      {content}
    </Dialog>
  );
}

export default ShareAccessDialog;
