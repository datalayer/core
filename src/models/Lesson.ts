/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IBaseNotebook } from "./Notebook";

export type ILesson = IBaseNotebook & {
  type: 'lesson';
};

export default ILesson;
