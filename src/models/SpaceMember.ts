/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Member } from "./Member";
import { ISpace } from "./Space";

export type SpaceMember = Member & {
  space?: ISpace;
};

export default SpaceMember;
