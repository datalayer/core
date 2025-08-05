/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IUser } from "./User";

export type CodeBlock = {
  id: string;
  type: 'codeblock';
  code: string;
  author: IUser;
  ancestor: CodeBlock;
  descendants: CodeBlock[];
};

export default CodeBlock;
