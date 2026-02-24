/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties, type ReactNode } from 'react';
import { ThemeProvider as PrimerBrandThemeProvider } from '@primer/react-brand';
import { useSystemColorMode } from './useSystemColorMode';
import type { BrandTheme } from './themes-brand/spatialBrandTheme';

export type ColorMode = 'light' | 'dark' | 'auto';

export interface IDatalayerBrandThemeProviderProps {
  /**
   * Color mode to use.
   * - `'light'` / `'dark'` — explicit override
   * - `'auto'` — follow the operating system preference (prefers-color-scheme)
   */
  colorMode?: ColorMode;
  /**
   * A brand theme object with per-mode CSS variable overrides.
   * Each key (`light` / `dark`) is a `CSSProperties` map whose entries
   * are `--brand-color-*` / `--brand-button-*` custom properties.
   *
   * When omitted, the default Primer Brand tokens are used unchanged.
   */
  brandTheme?: BrandTheme;
  /**
   * Additional inline styles merged on top of the resolved brand theme.
   */
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Theme provider for Primer Brand (`@primer/react-brand`) components.
 *
 * Works by passing CSS custom-property overrides as inline `style` to
 * `ThemeProvider`, which scopes them to its DOM subtree — exactly how
 * the VS Code extension re-skins Primer via CSS variables.
 *
 * ```tsx
 * import { DatalayerBrandThemeProvider } from '@datalayer/core/lib/theme';
 * import { spatialBrandTheme } from '@datalayer/core/lib/theme/themes-brand/spatialBrandTheme';
 *
 * <DatalayerBrandThemeProvider colorMode="dark" brandTheme={spatialBrandTheme}>
 *   <Hero>…</Hero>
 * </DatalayerBrandThemeProvider>
 * ```
 */
export function DatalayerBrandThemeProvider({
  colorMode = 'light',
  brandTheme,
  style,
  children,
}: IDatalayerBrandThemeProviderProps): JSX.Element {
  const systemMode = useSystemColorMode();
  const resolved: 'light' | 'dark' =
    colorMode === 'auto' ? systemMode : colorMode;

  const themeOverrides: CSSProperties | undefined = brandTheme
    ? resolved === 'dark'
      ? brandTheme.dark
      : brandTheme.light
    : undefined;

  return (
    <PrimerBrandThemeProvider
      colorMode={resolved}
      style={{
        ...themeOverrides,
        ...style,
      }}
    >
      {children}
    </PrimerBrandThemeProvider>
  );
}
