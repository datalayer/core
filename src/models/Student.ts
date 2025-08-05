/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IUser } from "./User";
import { IStudentItem } from "./StudentItem";

export type IStudent = IUser & {
  studentItems?: Map<string, IStudentItem>;
};

export default IStudent;
