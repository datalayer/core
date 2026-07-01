/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActionList, ActionMenu, Box, Button, Label, Text } from '@primer/react';
import {
  OrganizationIcon,
  PeopleIcon,
  PersonIcon,
  TriangleDownIcon,
} from '@primer/octicons-react';
import { useCache, useAuthorization } from '../../hooks';
import { useCoreStore } from '../../state';
import { useIAMStore } from '../../state/substates';
import { memberships as fetchMemberships } from '../../api/iam/profile';
import { usePrincipalStore } from '../../hooks/usePrincipalStore';
import { useBillableAccountStore } from '../../hooks/useBillableAccountStore';
import { useSelectedPrincipal } from '../../hooks/useSelectedPrincipal';
import { formatFriendlyHandle } from '../../utils/Handles';

type TeamMembership = {
  uid: string;
  handle: string;
  organizationUid?: string;
  organizationHandle?: string;
};

export type PrincipalSwitcherMenuProps = {
  maxLabelChars?: number;
  fullWidth?: boolean;
  showClosedBorder?: boolean;
};

function truncatePrincipalLabel(label: string, maxChars: number): string {
  const trimmed = (label || '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}

/**
 * PrincipalSwitcherMenu — the *only* component allowed to write to the
 * principal store and the billable account store. It keeps both stores in
 * sync per the rule:
 *   - selecting a user/org principal → billable account = same user/org
 *   - selecting a team principal     → billable account = the team's parent org
 */
export function PrincipalSwitcherMenu({
  maxLabelChars = 48,
  fullWidth = true,
  showClosedBorder = true,
}: PrincipalSwitcherMenuProps): JSX.Element {
  const { user, token, iamRunUrl } = useIAMStore();
  const { configuration } = useCoreStore();
  const { checkIsPlatformAdmin } = useAuthorization();
  const { useUserOrganizations } = useCache();
  const organizationsQuery = useUserOrganizations();
  const organizations = organizationsQuery.data || [];
  const isOrganizationsLoading = organizationsQuery.isLoading;
  const isPlatformAdmin = user ? checkIsPlatformAdmin(user) : false;
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const selectPersonalPrincipal = usePrincipalStore(
    state => state.selectPersonalPrincipal,
  );
  const selectOrganizationPrincipal = usePrincipalStore(
    state => state.selectOrganizationPrincipal,
  );
  const selectTeamPrincipal = usePrincipalStore(
    state => state.selectTeamPrincipal,
  );
  const setBillableAccount = useBillableAccountStore(
    state => state.setBillableAccount,
  );

  const {
    selectedPrincipalKind,
    selectedPrincipalUid,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationHandle,
  } = useSelectedPrincipal();

  const personalUid = user?.uid || user?.id || '';
  const personalHandle = user?.handle || '';

  const selectUser = (uid: string, handle: string) => {
    selectPersonalPrincipal(uid, handle);
    setBillableAccount({ kind: 'user', uid, handle });
  };

  const selectOrganization = (uid: string, handle: string) => {
    selectOrganizationPrincipal(uid, handle);
    setBillableAccount({ kind: 'organization', uid, handle });
  };

  const selectTeam = (team: TeamMembership, orgHandle: string) => {
    if (!team.organizationUid) {
      return;
    }
    selectTeamPrincipal({
      teamUid: team.uid,
      teamHandle: team.handle,
      organizationUid: team.organizationUid,
      organizationHandle: orgHandle,
    });
    setBillableAccount({
      kind: 'organization',
      uid: team.organizationUid,
      handle: orgHandle,
    });
  };

  const getOrganizationUid = (organization: any): string =>
    String(organization?.uid || organization?.id || '');

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (org: any) => getOrganizationUid(org) === selectedPrincipalUid,
      ),
    [organizations, selectedPrincipalUid],
  );

  const selectedTeam = useMemo(
    () => teams.find(team => team.uid === selectedPrincipalUid),
    [teams, selectedPrincipalUid],
  );

  useEffect(() => {
    let cancelled = false;
    const loadTeams = async () => {
      if (!token) {
        setTeams([]);
        return;
      }
      setTeamsLoading(true);
      try {
        const baseUrl = iamRunUrl || configuration.iamRunUrl;
        const response = await fetchMemberships(token, baseUrl);
        const rawMemberships = Array.isArray((response as any)?.memberships)
          ? (response as any).memberships
          : [];
        const mappedTeams = rawMemberships
          .filter((membership: any) => membership?.type === 'team')
          .map((membership: any) => ({
            uid: String(membership?.uid || membership?.id || '').trim(),
            handle: String(membership?.handle || '').trim(),
            organizationUid:
              String(membership?.organization_uid || '').trim() || undefined,
            organizationHandle:
              String(
                membership?.organization_handle ||
                  membership?.organization?.handle ||
                  '',
              ).trim() || undefined,
          }))
          .filter((team: TeamMembership) => Boolean(team.uid && team.handle));
        if (!cancelled) {
          setTeams(mappedTeams);
        }
      } catch {
        if (!cancelled) {
          setTeams([]);
        }
      } finally {
        if (!cancelled) {
          setTeamsLoading(false);
        }
      }
    };
    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, [token, iamRunUrl, configuration.iamRunUrl]);

  useEffect(() => {
    if (!personalUid || !personalHandle) {
      return;
    }
    if (!selectedPrincipalUid) {
      selectUser(personalUid, personalHandle);
      return;
    }
    // Keep explicit organization/team selections stable across route transitions,
    // even while memberships/organizations are still loading or temporarily
    // unavailable for a given view.
    if (selectedPrincipalKind === 'organization' || selectedPrincipalKind === 'team') {
      return;
    }
    if (
      selectedPrincipalKind === 'personal' &&
      selectedPrincipalUid !== personalUid
    ) {
      selectUser(personalUid, personalHandle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    personalUid,
    personalHandle,
    selectedPrincipalUid,
    selectedPrincipalKind,
    isOrganizationsLoading,
    teamsLoading,
    selectedOrganization,
    selectedTeam,
  ]);

  const effectiveHandle =
    selectedPrincipalKind === 'organization'
      ? selectedOrganization?.handle ||
        selectedPrincipalHandle ||
        personalHandle
      : selectedPrincipalKind === 'team'
        ? selectedTeam?.handle || selectedPrincipalHandle || personalHandle
        : personalHandle;

  const organizationHandleByUid = useMemo(() => {
    const byUid = new Map<string, string>();
    for (const organization of organizations) {
      const uid = getOrganizationUid(organization);
      const handle = String(organization?.handle || '').trim();
      if (uid && handle) {
        byUid.set(uid, handle);
      }
    }
    return byUid;
  }, [organizations]);

  const resolveTeamOrganizationHandle = (team?: TeamMembership): string => {
    if (!team) {
      return '';
    }
    const directHandle = String(team.organizationHandle || '').trim();
    if (directHandle) {
      return directHandle;
    }
    const fromOrganizations = team.organizationUid
      ? organizationHandleByUid.get(team.organizationUid) || ''
      : '';
    return fromOrganizations.trim();
  };

  const effectiveOrganizationHandle =
    selectedPrincipalKind === 'team'
      ? resolveTeamOrganizationHandle(selectedTeam) ||
        selectedTeamParentOrganizationHandle ||
        ''
      : '';

  const selectedPrincipalLabel =
    selectedPrincipalKind === 'team'
      ? `@${formatFriendlyHandle(effectiveOrganizationHandle || personalHandle || 'organization')}/${formatFriendlyHandle(effectiveHandle)}`
      : `@${formatFriendlyHandle(effectiveHandle)}`;
  const selectedPrincipalLabelClosed = truncatePrincipalLabel(
    selectedPrincipalLabel,
    maxLabelChars,
  );

  const isCurrentUserPrincipal = selectedPrincipalKind === 'personal';
  const selectedItemSx = {
    bg: 'accent.subtle',
    borderColor: 'accent.muted',
    color: 'accent.fg',
    fontWeight: 'semibold',
  } as const;
  const adminBadgeSx = {
    bg: 'attention.subtle',
    color: 'attention.fg',
    textTransform: 'lowercase',
    lineHeight: 1.2,
  } as const;

  return (
    <ActionMenu>
      <ActionMenu.Anchor>
        {showClosedBorder ? (
          <Box
            as="button"
            type="button"
            aria-label="Switch principal"
            sx={{
              width: fullWidth ? '100%' : 'auto',
              boxSizing: 'border-box',
              px: 2,
              py: 2,
              fontSize: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 120ms ease',
              ':hover': {
                bg: 'canvas.subtle',
              },
              ':focus-visible': {
                bg: 'canvas.subtle',
                outline: '2px solid',
                outlineColor: 'accent.emphasis',
                outlineOffset: '2px',
              },
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'fg.muted',
                flexShrink: 0,
              }}
            >
              {selectedPrincipalKind === 'organization' ? (
                <OrganizationIcon size={16} />
              ) : selectedPrincipalKind === 'team' ? (
                <PeopleIcon size={16} />
              ) : (
                <PersonIcon size={16} />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Text
                sx={{
                  display: 'block',
                  color: 'accent.fg',
                  fontWeight: 'semibold',
                  fontSize: 'inherit',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {selectedPrincipalLabelClosed}
              </Text>
            </Box>
            {isPlatformAdmin && isCurrentUserPrincipal ? (
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Label variant="secondary" size="small" sx={adminBadgeSx}>
                  admin
                </Label>
              </Box>
            ) : null}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'fg.muted',
                flexShrink: 0,
                ml: isPlatformAdmin && isCurrentUserPrincipal ? 1 : 0,
              }}
            >
              <TriangleDownIcon size={12} />
            </Box>
          </Box>
        ) : (
          <Button
            variant="invisible"
            size="small"
            aria-label="Switch principal"
            trailingVisual={TriangleDownIcon}
            sx={{
              maxWidth: fullWidth ? '100%' : ['200px', '260px', '360px'],
              width: fullWidth ? '100%' : 'auto',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'fg.muted',
                  flexShrink: 0,
                }}
              >
                {selectedPrincipalKind === 'organization' ? (
                  <OrganizationIcon size={16} />
                ) : selectedPrincipalKind === 'team' ? (
                  <PeopleIcon size={16} />
                ) : (
                  <PersonIcon size={16} />
                )}
              </Box>
              <Box
                sx={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Text
                  sx={{
                    color: 'accent.fg',
                    fontWeight: 'semibold',
                  }}
                >
                  {selectedPrincipalLabelClosed}
                </Text>
              </Box>
              {isPlatformAdmin && isCurrentUserPrincipal ? (
                <Label variant="secondary" size="small" sx={adminBadgeSx}>
                  admin
                </Label>
              ) : null}
            </Box>
          </Button>
        )}
      </ActionMenu.Anchor>
      <ActionMenu.Overlay width="medium">
        <ActionList>
          <ActionList.Group>
            <ActionList.GroupHeading>Personal</ActionList.GroupHeading>
            <ActionList.Item
              disabled={isCurrentUserPrincipal}
              selected={isCurrentUserPrincipal}
              sx={isCurrentUserPrincipal ? selectedItemSx : undefined}
              onSelect={() => {
                if (isCurrentUserPrincipal) {
                  return;
                }
                if (personalUid && personalHandle) {
                  selectUser(personalUid, personalHandle);
                }
              }}
            >
              <ActionList.LeadingVisual>
                <PersonIcon />
              </ActionList.LeadingVisual>
              @{formatFriendlyHandle(personalHandle || 'me')}
              {isPlatformAdmin ? (
                <ActionList.TrailingVisual>
                  <Label variant="secondary" size="small" sx={adminBadgeSx}>
                    admin
                  </Label>
                </ActionList.TrailingVisual>
              ) : null}
            </ActionList.Item>
          </ActionList.Group>
          <ActionList.Group>
            <ActionList.GroupHeading>Organizations</ActionList.GroupHeading>
            {organizations.length === 0 ? (
              <ActionList.Item disabled>No organizations</ActionList.Item>
            ) : (
              organizations.map((organization: any) => {
                const organizationUid = getOrganizationUid(organization);
                const isCurrentOrganizationPrincipal =
                  selectedPrincipalKind === 'organization' &&
                  selectedPrincipalUid === organizationUid;
                return (
                  <ActionList.Item
                    key={organizationUid}
                    disabled={isCurrentOrganizationPrincipal}
                    selected={isCurrentOrganizationPrincipal}
                    sx={
                      isCurrentOrganizationPrincipal
                        ? selectedItemSx
                        : undefined
                    }
                    onSelect={() => {
                      if (isCurrentOrganizationPrincipal) {
                        return;
                      }
                      if (organizationUid && organization.handle) {
                        selectOrganization(
                          organizationUid,
                          organization.handle,
                        );
                      }
                    }}
                  >
                    <ActionList.LeadingVisual>
                      <OrganizationIcon />
                    </ActionList.LeadingVisual>
                    <Box
                      as="span"
                      title={`@${organization.handle}`}
                      sx={{
                        display: 'block',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      @{organization.handle}
                    </Box>
                  </ActionList.Item>
                );
              })
            )}
          </ActionList.Group>
          <ActionList.Group>
            <ActionList.GroupHeading>Teams</ActionList.GroupHeading>
            {teams.length === 0 ? (
              <ActionList.Item disabled>No teams</ActionList.Item>
            ) : (
              teams.map(team => {
                const isCurrentTeamPrincipal =
                  selectedPrincipalKind === 'team' &&
                  selectedPrincipalUid === team.uid;
                const orgHandle =
                  resolveTeamOrganizationHandle(team) ||
                  personalHandle ||
                  'organization';
                return (
                  <ActionList.Item
                    key={team.uid}
                    disabled={isCurrentTeamPrincipal}
                    selected={isCurrentTeamPrincipal}
                    sx={isCurrentTeamPrincipal ? selectedItemSx : undefined}
                    onSelect={() => {
                      if (isCurrentTeamPrincipal) {
                        return;
                      }
                      selectTeam(team, orgHandle);
                    }}
                  >
                    <ActionList.LeadingVisual>
                      <PeopleIcon />
                    </ActionList.LeadingVisual>
                    <Box
                      as="span"
                      title={`@${formatFriendlyHandle(orgHandle)}/${formatFriendlyHandle(team.handle)}`}
                      sx={{
                        display: 'block',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      @{formatFriendlyHandle(orgHandle)}/
                      {formatFriendlyHandle(team.handle)}
                    </Box>
                  </ActionList.Item>
                );
              })
            )}
          </ActionList.Group>
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}

export default PrincipalSwitcherMenu;
