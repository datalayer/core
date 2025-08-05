/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Member } from "./Member";
import { IOrganization } from "./Organization";

export type IOrganizationMember = Member & {
  organization?: IOrganization;
};

export default IOrganizationMember;
