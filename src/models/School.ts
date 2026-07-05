/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IDean } from './Dean';
import { IStudent } from './Student';
import { IBaseOrganization } from './Organization';

/**
 * A school organization.
 *
 * The `courses` field is generic over the course type. The concrete course
 * model lives in the runtime/content package (`@datalayer/agent-runtimes`),
 * so consumers that need the rich `ICourse` shape parameterize this type; the
 * core package intentionally does not depend on the content models.
 *
 * @typeParam C - The course type carried by the `courses` array.
 */
export type ISchool<C = unknown> = IBaseOrganization & {
  type: 'school';
  dean?: IDean;
  students: Array<IStudent>;
  courses: Array<C>;
};

export default ISchool;
