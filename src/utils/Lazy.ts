/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  ComponentType,
  createElement,
  forwardRef,
  lazy as reactLazy,
  useState,
} from 'react';

export type PreloadableComponent<T extends ComponentType<any>> = T & {
  preload: () => Promise<void>;
};

/**
 * `React.lazy`, with a `preload()` that fetches the module ahead of the
 * first render.
 *
 * Two rules keep it honest:
 *
 * - **One fetch.** `preload()` and React's own first render share a single
 *   call to `factory`. They used to call it separately, so a component that
 *   was preloaded and then rendered imported its module twice.
 * - **One element type per mounted instance.** The component renders the
 *   loaded module directly when it was already loaded at mount — no fallback
 *   flash — and the lazy wrapper otherwise, and it keeps that choice for its
 *   lifetime. It used to switch from the wrapper to the loaded module on any
 *   render after `preload()` resolved, and React remounts on a change of
 *   element type: a component preloaded after it had mounted lost its state
 *   and ran its effects again on its next render.
 *
 * A failed fetch is forgotten, so the next `preload()` tries again rather
 * than replaying the failure.
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  let factoryPromise: Promise<{ default: T }> | undefined;
  let LoadedComponent: T | undefined;
  const load = (): Promise<{ default: T }> => {
    if (!factoryPromise) {
      factoryPromise = factory().then(
        module => {
          LoadedComponent = module.default;
          return module;
        },
        error => {
          factoryPromise = undefined;
          throw error;
        },
      );
    }
    return factoryPromise;
  };
  const LazyComponent = reactLazy(load);
  const Component = forwardRef(function LazyWithPreload(props, ref) {
    const [Resolved] = useState<ComponentType<any>>(
      () => LoadedComponent ?? LazyComponent,
    );
    return createElement(
      Resolved,
      Object.assign(ref ? { ref } : {}, props) as any,
    );
  }) as any as PreloadableComponent<T>;
  Component.preload = () => load().then(() => undefined);
  return Component;
}

export default lazyWithPreload;
