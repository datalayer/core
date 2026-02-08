/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import { BaseStyles, ThemeProvider, ThemeProviderProps } from '@primer/react';
import { datalayerTheme, datalayerColors } from './DatalayerTheme';
const baseStyleLight: CSSProperties = {
  backgroundColor: datalayerColors.white,
  color: datalayerColors.black,
  fontSize: 'var(--text-body-size-medium)',
} as CSSProperties;

const baseStyleDark: CSSProperties = {
  backgroundColor: datalayerColors.black,
  color: datalayerColors.white,
  fontSize: 'var(--text-body-size-medium)',
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
  'theme'
> {
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
  const isDark = colorMode === 'dark' || colorMode === 'night';
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
    <ThemeProvider colorMode={colorMode} theme={resolvedTheme} {...rest}>
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
