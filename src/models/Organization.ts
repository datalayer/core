/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { asArray } from "../utils";
import { asUser } from "./User";
import { ITeam } from "./Team";
import { ISchool } from "./School";
import { IOrganizationMember } from "./OrganizationMember";

/**
 * Convert the raw user object to {@link IOrganization}.
 *
 * @param org Raw user object from DB
 * @returns Organizatin
 */
export function asOrganization(org: any): IOrganization {
  let members = new Array<IOrganizationMember>();
  if (org.members) {
    members = asArray(org.members).map(m => {
      const member: IOrganizationMember = asUser(m);
      return member;
    })
  }
  const organization: IOrganization = {
    id: org.uid,
    handle: org.handle_s,
    type: 'organization',
    name: org.name_t,
    description: org.description_t,
    public: org.public_b,
    members,
    teams: [],
    creationDate: new Date(org.creation_ts_dt),
    setMembers(members: IOrganizationMember[]) {
      this.members = members;
    },
  };
  return organization;
}

export type IAnyOrganization = IOrganization | ISchool;

export type IBaseOrganization = {
  id: string;
  handle: string;
  type: string;
  name: string;
  description: string;
  public: boolean;
  creationDate: Date;
  members: IOrganizationMember[];
  setMembers: (members: IOrganizationMember[]) => void;
};

export type IOrganization = IBaseOrganization & {
  type: "organization";
  teams: ITeam[];
};

export default IOrganization;
