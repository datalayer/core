/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser } from './User';
import { IStudentItem } from './StudentItem';

export type IStudent = IUser & {
  studentItems?: Map<string, IStudentItem>;
};

export default IStudent;
