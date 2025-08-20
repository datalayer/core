/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect } from 'react';

const useExternalScript = (url: string) => {
  useEffect(() => {
    const head = document.querySelector('head') as HTMLElement;
    const script = document.createElement('script');

    script.setAttribute('src', url);
    head.appendChild(script);

    return () => {
      head.removeChild(script);
    };
  }, [url]);
};

export default useExternalScript;
