/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Theme-aware wrapper for the OTEL example.
 *
 * Uses the reusable `ThemedProvider` from primer-addons, wired to
 * the app-specific `useOtelThemeStore`.
 */

import React from 'react';
import {
  ThemedProvider as PrimerThemedProvider,
  type ThemedProviderProps,
} from '@datalayer/primer-addons/lib/theme/ThemedProvider';
import { useOtelThemeStore } from './themeStore';

/**
 * Drop-in `<ThemedProvider>` pre-wired to the OTEL theme store.
 * Any explicit props are still respected as overrides.
 */
export const ThemedProvider: React.FC<
  React.PropsWithChildren<Omit<ThemedProviderProps, 'useStore'>>
> = ({ children, ...rest }) => (
  <PrimerThemedProvider useStore={useOtelThemeStore} {...rest}>
    {children}
  </PrimerThemedProvider>
);
