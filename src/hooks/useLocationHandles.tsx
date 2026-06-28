/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useLocation } from './useLocation';
import { useParams } from './useParams';
import { useRunStore } from '../state';

export const useLocationHandles = () => {
  const params = useParams();
  const { accountHandle, teamHandle, spaceHandle } = params;
  const { pathname } = useLocation();
  const runStore = useRunStore();
  if (pathname.startsWith('/public')) {
    return {
      accountHandle: runStore.iam().user?.handle,
      spaceHandler: runStore.layout().space?.handle,
    };
  }
  return {
    accountHandle,
    teamHandle,
    spaceHandle,
  };
};

export default useLocationHandles;
