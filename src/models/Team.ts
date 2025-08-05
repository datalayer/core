/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { asArray } from "../utils";
import { asUser } from "./User";
import { TeamMember } from "./TeamMember";
import IOrganization from "./Organization";

export type IAnyTeam = ITeam;

export function asTeam(t: any, organizationId: string): ITeam {
  let members = new Array<TeamMember>();
  if (t.members) {
    members = asArray(t.members).map(m => {
      const member: TeamMember = asUser(m);
      return member;
    })
  }
  const team: ITeam = {
    id: t.uid,
    handle: t.handle_s,
    type: 'team',
    name: t.name_t,
    description: t.description_t,
    public: t.public_b,
    members,
    organization: {
      id: organizationId,
    },
    creationDate: new Date(t.creation_ts_dt),
    setMembers(members: TeamMember[]) {
      this.members = members;
    },
  };
  return team;
}

export type IBaseTeam = {
  id: string;
  type: string;
  handle: string;
  name: string;
  description: string;
  public: boolean;
  creationDate: Date;
  lastUpdateDate?: Date;
  lastPublicationDate?: Date;
  setMembers: (members: TeamMember[]) => void
};

export type ITeam = IBaseTeam & {
  type: 'team';
  organization: Pick<IOrganization, "id">,
  members: TeamMember[];
};

export default ITeam;
