/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Theme-aware wrapper for the OTEL example.
 *
 * Drop-in replacement for `DatalayerThemeProvider` that automatically
 * reads theme / color-mode from the shared `useOtelThemeStore`.
 */

import React from 'react';
import {
  DatalayerThemeProvider,
  type IDatalayerThemeProviderProps,
} from '@datalayer/primer-addons/lib/theme/DatalayerThemeProvider';
import { themeConfigs } from '@datalayer/primer-addons/lib/theme/themeRegistry';
import { useOtelThemeStore } from './themeStore';

/**
 * Drop-in replacement for `<DatalayerThemeProvider>`.
 * Reads theme/colorMode from the OTEL theme store and
 * forwards them to the real provider.  Any explicit props
 * (colorMode, theme, themeStyles) are still respected as overrides.
 */
export const ThemedProvider: React.FC<
  React.PropsWithChildren<Omit<IDatalayerThemeProviderProps, 'ref'>>
> = ({ children, ...rest }) => {
  const { colorMode, theme: themeVariant } = useOtelThemeStore();
  const cfg = themeConfigs[themeVariant];

  return (
    <DatalayerThemeProvider
      colorMode={rest.colorMode ?? colorMode}
      theme={rest.theme ?? cfg.primerTheme}
      themeStyles={rest.themeStyles ?? cfg.themeStyles}
      {...rest}
    >
      {children}
    </DatalayerThemeProvider>
  );
};
