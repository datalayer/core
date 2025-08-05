/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IBaseSpace } from "./Space";
import { Instructor } from "./Instructor";
import { IStudent } from "./Student";
import { ISchool } from "./School";
import { ISpace } from "./Space";
import { ISpaceItem } from "./SpaceItem";

export type ICourse = IBaseSpace & {
  type: 'space';
  variant: "course";
  seedSpace?: ISpace;
  school?: ISchool;
  instructor?: Instructor;
  students?: Map<string, IStudent>;
  items: Array<ISpaceItem>;
  itemIds: Array<string>;
};

export default ICourse;
