/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect } from 'react';

const PRIMER_PORTAL_ROOT_ID = 'primer-portal-root';

/**
 * Ensure Primer portal root has a high z-index so overlays render above chat.
 */
export function useHighZIndexPortal() {
  useEffect(() => {
    const setPortalZIndex = () => {
      const portalRoot = document.getElementById(PRIMER_PORTAL_ROOT_ID);
      if (portalRoot) {
        portalRoot.style.zIndex = '9999';
        return true;
      }
      return false;
    };

    if (setPortalZIndex()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (setPortalZIndex()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}
