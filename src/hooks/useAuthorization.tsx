/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useLocation } from "react-router-dom";
import { IAnyOrganization, IOrganizationMember, IUser, PlatformRoles, OrganizationRoles, ITeam, TeamMember, TeamRoles, IAnyTeam } from '../models';
import useNavigate from "./useNavigate";

export const useAuthorization = () => {

  const navigate = useNavigate();
  const location = useLocation()

  const goToApplicationStateError = (message: string) => {
    console.warn(message);
    console.log("Application error while navigating to ", location);
    console.trace();
    navigate('/error/application/state');
  }

  // Account -------------------------------------------------------------------

  const checkUserAccountPermissions = (user: IUser, accountHandle: string) => {
    if (user.handle !== accountHandle) {
      goToApplicationStateError(`Permissions check failed for account handle: ${accountHandle} and user: ${user}`);
    }
  }

  // Platform -------------------------------------------------------------------

  const checkIsPlatformAdmin = (user: IUser) => {
    return user.roles.includes(PlatformRoles.Admin.handle);
  }

  const checkIsPlatformGrowthManager = (user: IUser) => {
    return user.roles.includes(PlatformRoles.GrowthManager.handle);
  }

  const checkIsPlatformSuccessManager = (user: IUser) => {
    return user.roles.includes(PlatformRoles.SuccessManager.handle);
  }

  const checkIsPlatformMember = (user: IUser) => {
    return user.roles.includes(PlatformRoles.Member.handle);
  }

  const checkIsPlatformFeaturesPreviewer = (user: IUser) => {
    return user.roles.includes(PlatformRoles.FeaturesPreviewer.handle);
  }

  const checkIsPlatformUsageReviewer = (user: IUser) => {
    return user.roles.includes(PlatformRoles.UsageReviewer.handle);
  }

  // Organization -------------------------------------------------------------------

  const checkUserIsOrganizationOwner = (user: IUser, organization: IAnyOrganization) => {
    for (let i=0; i < organization.members.length; i++) {      
      if (organization.members[i].id === user.id) {
        if (checkIsOrganizationOwner(organization.members[i])) {
          return true;
        }
      }
    }
    return false;
  }

  const checkIsOrganizationOwner = (member: IOrganizationMember) => {
    return member.roles.includes(OrganizationRoles.Owner.handle);
  }

  const checkIsOrganizationMember = (user: IUser, organization: IAnyOrganization) => {
    for (let i=0; i < organization.members.length; i++) {      
      if (organization.members[i].id === user.id) {
        return true;
      }
    }
    return false;
  }

  const checkOrganizationsMembership = (organizationHandle: string, organizations?: IAnyOrganization[]) => {
    if (organizations) {
      let isAllowed = false;
      for (let i=0; i < organizations.length; i++) {
        if (organizationHandle === organizations[i].handle) {
          isAllowed = true;
          break;
        }
      }
      if (!isAllowed) {
        goToApplicationStateError(`Check organizations membership fails for organization handle: ${organizationHandle} and organizations: ${organizations}`);
      }
    }
  }

  // Team -------------------------------------------------------------------

  const checkUserIsTeamOwer = (user: IUser, team: IAnyTeam) => {
    for (let i=0; i < team.members.length; i++) {      
      if (team.members[i].id === user.id) {
        if (checkIsTeamOwer(team.members[i])) {
          return true;
        }
      }
    }
    return false;
  }

  const checkIsTeamOwer = (member: TeamMember) => {
    return member.roles.includes(TeamRoles.Owner.handle);
  }

  const checkIsTeamMember = (user: IUser, team: ITeam) => {
    for (let i=0; i < team.members.length; i++) {      
      if (team.members[i].id === user.id) {
        return true;
      }
    }
    return false;
  }

  // Course -------------------------------------------------------------------

  const checkIsCourseStudent = (user: IUser, course: string) => {
    // TODO Implement this.
    return false;
  };

  // --------------------------------------------------------------------------

  return {
    checkIsCourseStudent,
    checkIsOrganizationMember,
    checkUserIsOrganizationOwner,
    checkIsPlatformAdmin,
    checkIsPlatformFeaturesPreviewer,
    checkIsPlatformGrowthManager,
    checkIsPlatformMember,
    checkIsPlatformSuccessManager,
    checkIsPlatformUsageReviewer,
    checkIsTeamMember,
    checkIsTeamOwer,
    checkOrganizationsMembership,
    checkUserAccountPermissions,
    checkIsOrganizationOwner,
    checkUserIsTeamOwer,
  };

}

export default useAuthorization;
