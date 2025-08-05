/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser } from "./User";
import { IOrganization } from "./Organization";

export type IAccount = IUser | IOrganization;

export default IAccount;
