/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { AlienIcon } from '@datalayer/icons-react';
import { IRole } from "./Role";

const ORGANIZATION_MEMBER_PERMSSIONS = [
  "invite_users",
];
const ORGANIZATION_SECURITY_AUDITOR_PERMSSIONS = [
  "view_landings",
];
const ORGANIZATION_USAGE_REVIEWER_PERMSSIONS = [
  "view_users",
];
const ORGANIZATION_ADMIN_PERMSSIONS = ORGANIZATION_MEMBER_PERMSSIONS.concat(...[
  "manage_users",
]);

export class OrganizationRoles {
  private constructor() {}

  static readonly Member: IRole = {
    id: 'organization_member',
    handle: 'organization_member',
    displayName: 'Organization Member',
    description: 'A Organization Member is the role given to any member of the organization.',
    permissions: ORGANIZATION_MEMBER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly SecurityAuditor: IRole = {
    id: 'organization_security_auditor',
    handle: 'organization_security_auditor',
    displayName: 'Organization Security Auditor',
    description: 'A Organization Security Auditor is given to ...',
    permissions: ORGANIZATION_SECURITY_AUDITOR_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly UsageReviewer: IRole = {
    id: 'organization_usage_reviewer',
    handle: 'organization_usage_reviewer',
    displayName: 'Organization Usage Reviewer',
    description: 'A Organization Usage Reviewer can review the platform usage.',
    permissions: ORGANIZATION_USAGE_REVIEWER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly Owner: IRole = {
    id: 'organization_owner',
    handle: 'organization_owner',
    displayName: 'Organization Owner',
    description: 'A Organization Owner is the owner of the organization.',
    permissions: ORGANIZATION_ADMIN_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly ALL_ROLES: IRole[] = [
    OrganizationRoles.Member,
    OrganizationRoles.Owner,
    OrganizationRoles.SecurityAuditor,
    OrganizationRoles.UsageReviewer,
  ]
  
}
