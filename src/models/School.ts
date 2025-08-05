/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
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
