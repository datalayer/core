/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * `@primer/react` 37 types its polymorphic `as` prop (`Heading`, `Text`,
 * `Link`, `Table.Title`, ...) against the global `JSX` namespace, which
 * `@types/react` 19 no longer declares: the only global `JSX` left is the one
 * `@github/relative-time-element` adds, so `keyof JSX.IntrinsicElements` is
 * `'relative-time'` and every `as="h3"` fails to type-check. Restore the
 * global namespace from React's own.
 *
 * The monorepo gets away without this because it patches `@primer/react`
 * (`patches/@primer+react+37.31.0.patch` at its root); a standalone install,
 * which is what CI and consumers get, does not.
 */
import type { JSX as ReactJSX } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}
