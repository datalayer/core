/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IDean } from "./Dean";
import { IStudent } from "./Student";
import { ICourse } from "./Course";
import { IBaseOrganization } from "./Organization";

export type ISchool = IBaseOrganization & {
  type: 'school';
  dean?: IDean;
  students: Array<IStudent>;
  courses: Array<ICourse>;
};

export default ISchool;
