/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
