/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Member } from "./Member";
import { ITeam } from "./Team";

export type TeamMember = Member & {
  team?: ITeam;
};

export default TeamMember;
