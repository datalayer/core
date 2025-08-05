/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box } from "@datalayer/primer-addons";
import { SkeletonBox } from "@primer/react/experimental";

export const NotebookSkeleton = () => {
  return (
    <>
      <SkeletonBox height="100px" />
      <Box style={{ height: 20}} />
      <SkeletonBox height="100px" />
      <Box style={{ height: 20}} />
      <SkeletonBox height="100px" />
      <Box style={{ height: 20}} />
      <SkeletonBox height="100px" />
    </>
  );
};

export default NotebookSkeleton;
