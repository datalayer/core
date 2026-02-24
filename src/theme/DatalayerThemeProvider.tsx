/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import { BaseStyles, ThemeProvider, ThemeProviderProps } from '@primer/react';
import { useSystemColorMode } from './useSystemColorMode';
import { datalayerTheme, datalayerThemeStyles } from './themes/datalayerTheme';

/**
 * Shared typographic rhythm — clean, spacious feel inspired by
 * modern developer-blog aesthetics (generous line-height, open
 * letter-spacing on headings, crisp body text).
 */
const typographyVars: CSSProperties = {
  '--text-body-lineHeight': '1.7',
  '--text-title-lineHeight': '1.2',
  '--text-title-letterSpacing': '-0.02em',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
} as CSSProperties;

export interface IDatalayerThemeProviderProps extends Omit<
  ThemeProviderProps,
  'theme' | 'colorMode'
> {
  /**
   * Color mode to use.
   * - `'light'` / `'dark'` — explicit override
   * - `'auto'` — follow the operating system preference (prefers-color-scheme)
   * - Primer's `'day'` / `'night'` are still accepted.
   */
  colorMode?: 'light' | 'dark' | 'auto' | 'day' | 'night';
  /**
   * Additional base styles merged on top of theme defaults.
   */
  baseStyles?: CSSProperties;
  /**
   * Optional Primer theme object. Defaults to the built-in datalayerTheme
   * (which is the unmodified default Primer theme — all theming is done
   * via CSS custom-property overrides in `themeStyles`).
   */
  theme?: Record<string, any>;
  /**
   * Per-mode CSS-property overrides (background, foreground, and all
   * Primer functional-token CSS custom properties).
   *
   * When provided, these replace the built-in datalayer styles entirely.
   * The `baseStyles` prop is still merged on top.
   *
   * Use the `buildThemeStyles` helper from `./themes/createThemeCSSVars`
   * to generate comprehensive overrides from a `ThemeColorDefs` pair.
   */
  themeStyles?: {
    light: CSSProperties;
    dark: CSSProperties;
  };
}

export function DatalayerThemeProvider(
  props: React.PropsWithChildren<IDatalayerThemeProviderProps>,
): JSX.Element {
  const { children, colorMode, baseStyles, theme, themeStyles, ...rest } =
    props;

  // Resolve 'auto' → actual system preference ('light' or 'dark').
  const systemMode = useSystemColorMode();
  const resolvedColorMode =
    colorMode === 'auto' ? systemMode : (colorMode ?? 'light');

  const isDark = resolvedColorMode === 'dark' || resolvedColorMode === 'night';
  const resolvedTheme = theme ?? datalayerTheme;
  const styles = themeStyles ?? datalayerThemeStyles;
  const resolvedStyles = isDark ? styles.dark : styles.light;

  return (
    <ThemeProvider
      colorMode={resolvedColorMode}
      theme={resolvedTheme}
      {...rest}
    >
      <BaseStyles
        style={{
          lineHeight: '1.7',
          transition: 'background-color 0.25s ease, color 0.25s ease',
          ...typographyVars,
          ...resolvedStyles,
          ...baseStyles,
        }}
      >
        {children}
      </BaseStyles>
    </ThemeProvider>
  );
}
