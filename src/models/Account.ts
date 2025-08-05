/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IUser } from "./User";
import { IOrganization } from "./Organization";

export type IAccount = IUser | IOrganization;

export default IAccount;
