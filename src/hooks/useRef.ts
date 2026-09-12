/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useRef } from 'react';

/**
 * There are some situations where we only want to create a new ref if one is not provided to a component
 * or hook as a prop. However, due to the `rules-of-hooks`, we cannot conditionally make a call to `React.useRef`
 * only in the situations where the ref is not provided as a prop.
 * This hook aims to encapsulate that logic, so the consumer doesn't need to be concerned with violating `rules-of-hooks`.
 * @param providedRef The ref to use - if undefined, will use the ref from a call to React.useRef
 * @type TRef The type of the RefObject which should be created.
 */

// React 19 types `useRef<T>(null)` as `RefObject<T | null>`, so both the
// accepted and returned ref are nullable here. Primer 37 still declares the
// React 18 shape, so its call sites cast at the boundary.
export function useProvidedRefOrCreate<TRef>(
  providedRef?: React.RefObject<TRef | null>,
): React.RefObject<TRef | null> {
  const createdRef = useRef<TRef>(null);
  return providedRef ?? createdRef;
}
