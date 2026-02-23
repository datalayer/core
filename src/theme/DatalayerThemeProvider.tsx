/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import { BaseStyles, ThemeProvider, ThemeProviderProps } from '@primer/react';
import { useSystemColorMode } from './useSystemColorMode';
import { datalayerTheme, datalayerColors } from './themes/datalayerTheme';

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

const baseStyleLight: CSSProperties = {
  backgroundColor: datalayerColors.white,
  color: datalayerColors.black,
  fontSize: 'var(--text-body-size-medium)',
  lineHeight: '1.7',
  transition: 'background-color 0.25s ease, color 0.25s ease',
  ...typographyVars,
} as CSSProperties;

const baseStyleDark: CSSProperties = {
  backgroundColor: datalayerColors.black,
  color: datalayerColors.white,
  fontSize: 'var(--text-body-size-medium)',
  lineHeight: '1.7',
  transition: 'background-color 0.25s ease, color 0.25s ease',
  ...typographyVars,
} as CSSProperties;

const primaryButtonVarsLight: CSSProperties = {
  '--button-primary-bgColor-rest': datalayerColors.greenText,
  '--button-primary-bgColor-hover': datalayerColors.greenHover,
  '--button-primary-bgColor-active': datalayerColors.greenHover,
  '--button-primary-fgColor-rest': datalayerColors.white,
  '--button-primary-borderColor-rest': datalayerColors.greenText,
  '--button-primary-borderColor-hover': datalayerColors.greenHover,
  '--color-btn-primary-bg': datalayerColors.greenText,
  '--color-btn-primary-hover-bg': datalayerColors.greenHover,
} as CSSProperties;

const primaryButtonVarsDark: CSSProperties = {
  '--button-primary-bgColor-rest': datalayerColors.greenAccent,
  '--button-primary-bgColor-hover': datalayerColors.greenBright,
  '--button-primary-bgColor-active': datalayerColors.greenBright,
  '--button-primary-fgColor-rest': datalayerColors.white,
  '--button-primary-borderColor-rest': datalayerColors.greenAccent,
  '--button-primary-borderColor-hover': datalayerColors.greenBright,
  '--color-btn-primary-bg': datalayerColors.greenAccent,
  '--color-btn-primary-hover-bg': datalayerColors.greenBright,
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
   * Optional Primer theme object. Defaults to the built-in datalayerTheme.
   */
  theme?: Record<string, any>;
  /**
   * Optional per-mode style overrides (base + button CSS vars).
   * When provided, these replace the built-in datalayer styles entirely.
   * The `baseStyles` prop is still merged on top.
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
  const defaultStyles = isDark
    ? { ...baseStyleDark, ...primaryButtonVarsDark }
    : { ...baseStyleLight, ...primaryButtonVarsLight };
  const resolvedStyles = themeStyles
    ? isDark
      ? themeStyles.dark
      : themeStyles.light
    : defaultStyles;
  return (
    <ThemeProvider
      colorMode={resolvedColorMode}
      theme={resolvedTheme}
      {...rest}
    >
      <BaseStyles
        style={{
          ...resolvedStyles,
          ...baseStyles,
        }}
      >
        {children}
      </BaseStyles>
    </ThemeProvider>
  );
}
