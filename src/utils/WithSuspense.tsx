/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Suspense } from "react";
import { SkeletonBox } from "@primer/react/experimental";

type ILoadingProps = {
  skeleton: boolean;
}

const Loading = (props: ILoadingProps) => {
  const { skeleton } = props;
  return (
    skeleton ?
      <>
        <SkeletonBox height="100px" />
      </>
    :
      <></>
  )
}

export const WithSuspense = (Component: any, preload = true, skeleton = false) => (props: any) => {
  if (preload) {
    Component.preload();
  }
  return (
    <Suspense fallback={<Loading skeleton={skeleton} />}>
      <Component {...props} />
    </Suspense>
  )
}

export default WithSuspense;
