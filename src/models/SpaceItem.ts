/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { INotebook } from "./Notebook";
import { IDocument } from "./Document";
import { ICell } from "./Cell";
import { IDataset } from "./Dataset";
import { IEnvironment } from "./Environment";
import { ILesson } from "./Lesson";
import { IExercise } from "./Exercise";
import { IAssignment } from "./Assignment";

export type ISpaceItem = IDataset | INotebook | ICell | IEnvironment | ILesson | IExercise | IAssignment | IDocument;

export default ISpaceItem;
