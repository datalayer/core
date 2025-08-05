/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IItem } from "./Item";

export type IDataset = IItem & {
  type: 'dataset';
  fileName: string;
  datasetExtension: string;
  contentLength: number;
  contentType: string;
  mimeType: string;
  mimeTypeParams?: {};
  bucketName?: string;
  path?: string
  creationDate: Date;
  lastPublicationDate?: Date;
  cdnUrl: string;
};

export default IDataset;
