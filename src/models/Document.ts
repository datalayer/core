/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IItem } from "./Item";

export type IBaseDocument = IItem & {
  model?: any;
};

export type IDocument = IBaseDocument & {
  type: 'document';
};

export default IDocument;
