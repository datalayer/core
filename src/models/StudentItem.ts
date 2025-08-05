/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IItemType } from "./ItemType";
import { IStudent } from "./Student";
import { ISpaceItem } from "./SpaceItem";

export type IStudentItem = {
  id: string,
  type: 'student_item';
  student?: IStudent;
  item?: ISpaceItem;
  itemId: string;
  itemType: IItemType;
  points?: number;
  nbgrades?: any;
  nbgradesTotalPoints?: number;
  nbgradesTotalScore?: number;
  completed?: boolean;
  codeStudent?: string;
  pass?: boolean;
  invalid?: boolean;
  invalidReason?: string;
};

export default IStudentItem;
