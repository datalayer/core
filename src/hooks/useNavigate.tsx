/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useLayoutStore } from '../state';

export const useNavigate = () => {
  const routerNavigate = useRouterNavigate();
  const layoutStore = useLayoutStore();
  const navigate = (location: string, e: any = undefined, resetPortals = true, options: any = undefined) => {
    if (e) {
      e.preventDefault();
    }
    if (resetPortals) {
      layoutStore.resetLeftPortal();
      layoutStore.resetRightPortal();
    }
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    routerNavigate(location, options);
  };
  return navigate;
};

export default useNavigate;
