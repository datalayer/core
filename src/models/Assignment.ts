/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IBaseNotebook } from "./Notebook";
import { IStudentItem } from "./StudentItem";

export type IAssignment = IBaseNotebook & {
  type: 'assignment';
  studentItem?: IStudentItem;
};

export default IAssignment;
