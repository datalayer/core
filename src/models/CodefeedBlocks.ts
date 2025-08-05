/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

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
