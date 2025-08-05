/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { CodeBlock } from "./CodeBlock";

export type ICodefeedBlocks = {
  id: string;
  type: "codefeed";
  blocks: CodeBlock[];
};

export default ICodefeedBlocks;
