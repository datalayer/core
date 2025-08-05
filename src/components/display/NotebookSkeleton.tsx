/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
