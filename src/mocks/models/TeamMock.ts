/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { ITeam, TeamMember } from "../../models";
import { newUlid } from "../../utils";

const newTeamMock = (name: string) => {
  const team: ITeam = {
    id: newUlid(),
    type: "team",
    handle: name,
    name: name,
    description: name + " description.",
    public: false,
    members: [],
    creationDate: new Date(),
    organization: {
      id: newUlid(),
    },
    setMembers: (members: TeamMember[]) => {},
  };
  return team;
};

export const TEAM_1_MOCK = newTeamMock("Team 1");
export const TEAM_2_MOCK = newTeamMock("Team 2");
export const TEAM_3_MOCK = newTeamMock("Team 3");

export const TEAMS_MOCK = [TEAM_1_MOCK, TEAM_2_MOCK, TEAM_3_MOCK];
