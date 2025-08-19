/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Member } from './Member';
import { IOrganization } from './Organization';

export type IOrganizationMember = Member & {
  organization?: IOrganization;
};

export default IOrganizationMember;
