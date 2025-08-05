/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { INotebookContent } from '@jupyterlab/nbformat';
import { IItem } from "./Item";
import { IDataset } from './Dataset';

export type IBaseNotebook = IItem & {
  nbformat?: INotebookContent;
  datasets: Array<IDataset>;
};

export type INotebook = IBaseNotebook & {
  type: 'notebook';
};

export default INotebook;
