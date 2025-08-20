/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { AlienIcon } from '@datalayer/icons-react';
import { IRole } from './Role';

const TEAM_MEMBER_PERMSSIONS = ['view_team'];
const TEAM_OWNER_PERMSSIONS = TEAM_MEMBER_PERMSSIONS.concat(
  ...['assign_team_user'],
);

export class TeamRoles {
  private constructor() {}

  static readonly Member: IRole = {
    id: 'team_member',
    handle: 'team_member',
    displayName: 'Team Member',
    description: 'A Team Member is part of a team.',
    permissions: TEAM_MEMBER_PERMSSIONS,
    icon: AlienIcon,
  };
  static readonly Owner: IRole = {
    id: 'team_owner',
    handle: 'team_owner',
    displayName: 'Team Owner',
    description: 'A Team Owner can add and remove team members.',
    permissions: TEAM_OWNER_PERMSSIONS,
    icon: AlienIcon,
  };
  static readonly ALL_ROLES: IRole[] = [TeamRoles.Member, TeamRoles.Owner];
}
