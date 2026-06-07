/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * PrincipalBanner — displays the currently selected principal
 * (user, organization, or team) with a colored visual so a user
 * can immediately see which principal a settings page applies to.
 */

import { Box, Label, Text } from '@primer/react';
import {
  OrganizationIcon,
  PeopleIcon,
  PersonIcon,
} from '@primer/octicons-react';
import type { ReactNode } from 'react';
import { useSelectedPrincipal } from '../../hooks/useSelectedPrincipal';
import { useIAMStore } from '../../state/substates';

export type PrincipalBannerProps = {
  caption?: string;
  rightContent?: ReactNode;
};

export const PrincipalBanner = ({
  caption,
  rightContent,
}: PrincipalBannerProps) => {
  const { user } = useIAMStore();
  const {
    selectedPrincipalKind,
    selectedPrincipalHandle,
    selectedTeamParentOrganizationHandle,
  } = useSelectedPrincipal();

  const isOrganization = selectedPrincipalKind === 'organization';
  const isTeam = selectedPrincipalKind === 'team';
  const handle = isOrganization
    ? selectedPrincipalHandle || ''
    : isTeam
      ? `${selectedTeamParentOrganizationHandle || 'organization'}/${selectedPrincipalHandle || 'team'}`
      : user?.handle || selectedPrincipalHandle || '';
  const Icon = isOrganization
    ? OrganizationIcon
    : isTeam
      ? PeopleIcon
      : PersonIcon;

  const accent = isOrganization ? 'done' : isTeam ? 'attention' : 'accent';
  const bg = isOrganization
    ? 'done.subtle'
    : isTeam
      ? 'attention.subtle'
      : 'accent.subtle';
  const borderColor = isOrganization
    ? 'done.muted'
    : isTeam
      ? 'attention.muted'
      : 'accent.muted';
  const fg = isOrganization ? 'done.fg' : isTeam ? 'attention.fg' : 'accent.fg';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        p: 3,
        border: '1px solid',
        borderColor,
        borderRadius: 2,
        bg,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bg: 'canvas.default',
          border: '1px solid',
          borderColor,
          color: fg,
          flex: '0 0 auto',
        }}
      >
        <Icon size={20} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Text
            sx={{
              color: 'fg.muted',
              fontSize: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Principal
          </Text>
          <Label variant={accent as any}>
            {isOrganization ? 'Organization' : isTeam ? 'Team' : 'User'}
          </Label>
        </Box>
        <Text as="p" sx={{ m: 0, mt: 1, fontWeight: 600, color: 'fg.default' }}>
          {handle
            ? `@${handle}`
            : isOrganization
              ? 'Organization'
              : isTeam
                ? 'Team'
                : 'User'}
        </Text>
        {caption && (
          <Text as="p" sx={{ m: 0, mt: 1, color: 'fg.muted', fontSize: 1 }}>
            {caption}
          </Text>
        )}
      </Box>
      {rightContent ? (
        <Box
          sx={{
            flex: ['1 1 100%', '0 0 auto'],
            width: ['100%', 'min(640px, 58%)'],
          }}
        >
          {rightContent}
        </Box>
      ) : null}
    </Box>
  );
};

export default PrincipalBanner;
