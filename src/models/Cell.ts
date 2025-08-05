/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IItem } from "./Item";

export type ICell = IItem & {
  type: 'cell';
  source: string;
  outputshotUrl?: string;
  outputshotData?: string;
}

export default ICell;
