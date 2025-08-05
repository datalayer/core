/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IExercise } from './Exercise';
import { IDataset } from './Dataset';

export type LibraryType = 'public' | 'private';

export type Library = {
  id: string;
  type: LibraryType;
  exercises: Array<IExercise>;
  datasets: Array<IDataset>;
};

export default Library;
