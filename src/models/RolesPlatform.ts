/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { AlienIcon, UserIcon, PersonIcon, PassportControlIcon } from '@datalayer/icons-react';
import { IRole } from "./Role";

const PLATFORM_ANONYMOUS_PERMSSIONS = [
  "view_landings",
]
const PLATFORM_SECURITY_AUDITOR_PERMSSIONS = [
  "view_landings",
]
const PLATFORM_USAGE_REVIEWER_PERMSSIONS = [
  "view_landings",
]
const PLATFORM_FEATURES_PREVIEWER_PERMSSIONS = [
  "view_landings",
]
const PLATFORM_GUEST_PERMSSIONS = PLATFORM_ANONYMOUS_PERMSSIONS.concat(...[
  "view_users",
]);
const PLATFORM_MEMBER_PERMSSIONS = PLATFORM_GUEST_PERMSSIONS.concat(...[
  "invite_users",
]);
const PLATFORM_SUPPORT_MANAGER_PERMSSIONS = PLATFORM_GUEST_PERMSSIONS.concat(...[
  "invite_users",
]);
const PLATFORM_GROWTH_MANAGER_PERMSSIONS = PLATFORM_GUEST_PERMSSIONS.concat(...[
  "invite_users",
]);
const PLATFORM_SUCCESS_MANAGER_PERMSSIONS = PLATFORM_GUEST_PERMSSIONS.concat(...[
  "invite_users",
]);
const PLATFORM_IAM_TOKEN_PERMSSIONS = PLATFORM_MEMBER_PERMSSIONS.concat(...[
  "invite_users",
]);
const PLATFORM_ADMIN_PERMSSIONS = PLATFORM_MEMBER_PERMSSIONS.concat(...[
  "manage_users",
]);

export class PlatformRoles {
  private constructor() {}

  static readonly Anonymous: IRole = {
    id: 'platform_anonymous',
    handle: 'platform_anonymous',
    displayName: 'Platform Anonymous',
    description: 'A Platform Anonymous is given to an anonymous visitor of the platform who does not have any account.',
    permissions: PLATFORM_ANONYMOUS_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly Guest: IRole = {
    id: 'platform_guest',
    handle: 'platform_guest',
    displayName: 'Platform Guest',
    description: 'A Platform Guest to an guest of the platform who eg. has requested access to the platform.',
    permissions: PLATFORM_GUEST_PERMSSIONS,
    icon: PersonIcon,
  }
  static readonly Member: IRole = {
    id: 'platform_member',
    handle: 'platform_member',
    displayName: 'Platform Member',
    description: 'A Platform Member is the role given to any member of the platform.',
    permissions: PLATFORM_MEMBER_PERMSSIONS,
    icon: UserIcon,
  }
  static readonly IAMToken: IRole = {
    id: 'platform_iam_token',
    handle: 'platform_iam_token',
    displayName: 'Platform IAM Token',
    description: 'A Platform IAM Token.',
    permissions: PLATFORM_IAM_TOKEN_PERMSSIONS,
    icon: UserIcon,
  }
  static readonly SupportManager: IRole = {
    id: 'platform_support_manager',
    handle: 'platform_support_manager',
    displayName: 'Platform Support Manager',
    description: 'A Platform Support Manager supports users.',
    permissions: PLATFORM_SUPPORT_MANAGER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly GrowthManager: IRole = {
    id: 'platform_growth_manager',
    handle: 'platform_growth_manager',
    displayName: 'Platform Growth Manager',
    description: 'A Platform Growth Manager growths Datalayer.',
    permissions: PLATFORM_GROWTH_MANAGER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly SuccessManager: IRole = {
    id: 'platform_success_manager',
    handle: 'platform_success_manager',
    displayName: 'Platform Success Manager',
    description: 'A Platform Success Manager ensures user success.',
    permissions: PLATFORM_SUCCESS_MANAGER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly SecurityAuditor: IRole = {
    id: 'platform_security_auditor',
    handle: 'platform_security_auditor',
    displayName: 'Platform Security Auditor',
    description: 'A Platform Security Auditor is given to access to create security reviews.',
    permissions: PLATFORM_SECURITY_AUDITOR_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly FeaturesPreviewer: IRole = {
    id: 'platform_features_previewer',
    handle: 'platform_features_previewer',
    displayName: 'Platform Features Previewer',
    description: 'A Platform Features Previewer can see features before others.',
    permissions: PLATFORM_FEATURES_PREVIEWER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly UsageReviewer: IRole = {
    id: 'platform_usage_reviewer',
    handle: 'platform_usage_reviewer',
    displayName: 'Platform Usage Reviewer',
    description: 'A Platform Usage Reviewer can review the platform usage.',
    permissions: PLATFORM_USAGE_REVIEWER_PERMSSIONS,
    icon: AlienIcon,
  }
  static readonly Admin: IRole = {
    id: 'platform_admin',
    handle: 'platform_admin',
    displayName: 'Platform Admin',
    description: 'A Platform Admin is the administrator of the platform.',
    permissions: PLATFORM_ADMIN_PERMSSIONS,
    icon: PassportControlIcon,
  }
  static readonly ALL_ROLES: IRole[] = [
    PlatformRoles.Admin,
    PlatformRoles.Anonymous,
    PlatformRoles.FeaturesPreviewer,
    PlatformRoles.Guest,
    PlatformRoles.Member,
    PlatformRoles.IAMToken,
    PlatformRoles.SecurityAuditor,
    PlatformRoles.SupportManager,
    PlatformRoles.GrowthManager,
    PlatformRoles.SuccessManager,
    PlatformRoles.UsageReviewer,
  ]

}
