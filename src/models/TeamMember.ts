/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Member } from "./Member";
import { ITeam } from "./Team";

export type TeamMember = Member & {
  team?: ITeam;
};

export default TeamMember;
