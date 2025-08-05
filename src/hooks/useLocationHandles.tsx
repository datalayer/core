/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useLocation, useParams } from "react-router-dom";
import { useRunStore } from "../state";

export const useLocationHandles = () => {
  const { accountHandle, spaceHandle } = useParams();
  const { pathname } = useLocation();
  const runStore = useRunStore();
  if (pathname.startsWith("/public")) {
    return {
      accountHandle: runStore.iam().user?.handle,
      spaceHandler: runStore.layout().space?.handle,
    }
  }
  return {
    accountHandle,
    spaceHandle,
  }
}

export default useLocationHandles;
