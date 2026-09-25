/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Suspense, type ReactNode } from 'react';
import { SkeletonBox } from '@primer/react/experimental';

type ILoadingProps = {
  skeleton: boolean;
};

const Loading = (props: ILoadingProps) => {
  const { skeleton } = props;
  return skeleton ? (
    <>
      <SkeletonBox height="100px" />
    </>
  ) : (
    <></>
  );
};

/**
 * A lazily-loaded route, with something to look at while it arrives.
 *
 * `skeleton` was a boolean between one grey box and **nothing at all**, and
 * nothing was the default — so every route in the application showed a blank
 * page for as long as its chunk took, which for an editor is seconds. It now
 * also takes a node, so a route can hand over a drawing of the thing that is
 * coming rather than a hole where it will be.
 */
export const WithSuspense =
  (Component: any, preload = true, skeleton: boolean | ReactNode = false) =>
  (props: any) => {
    if (preload) {
      Component.preload();
    }
    const fallback =
      typeof skeleton === 'boolean' ? (
        <Loading skeleton={skeleton} />
      ) : (
        skeleton
      );
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };

export default WithSuspense;
