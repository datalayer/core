/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser } from './User';

/**
 * A student user.
 *
 * The `studentItems` map is generic over the student-item type. The concrete
 * `IStudentItem` model lives in the runtime/content package
 * (`@datalayer/agent-runtimes`), so consumers that need the rich shape
 * parameterize this type; the core package intentionally does not depend on
 * the content models.
 *
 * @typeParam SI - The student-item type carried by the `studentItems` map.
 */
export type IStudent<SI = unknown> = IUser & {
  studentItems?: Map<string, SI>;
};

export default IStudent;
