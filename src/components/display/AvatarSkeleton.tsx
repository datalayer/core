/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { SkeletonAvatar } from "@primer/react/experimental";

type IAvatarSkeletonProps = {
  size?: number;
}

export const AvatarSkeleton = (props: IAvatarSkeletonProps) => {
  const { size } = props;
  return (
    <>
      <SkeletonAvatar size={size} />
    </>
  );
};

export default AvatarSkeleton;
