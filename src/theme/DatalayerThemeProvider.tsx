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
   * Base styles.
   */
  baseStyles?: CSSProperties;
}

export function DatalayerThemeProvider(
  props: React.PropsWithChildren<IDatalayerThemeProviderProps>,
): JSX.Element {
  const { children, colorMode, baseStyles, ...rest } = props;
  const isDark = colorMode === 'dark' || colorMode === 'night';
  const baseStyleDefaults = isDark ? baseStyleDark : baseStyleLight;
  const primaryButtonVars = isDark
    ? primaryButtonVarsDark
    : primaryButtonVarsLight;
  return (
    <ThemeProvider colorMode={colorMode} theme={datalayerTheme} {...rest}>
      <BaseStyles
        style={{
          ...baseStyleDefaults,
          ...primaryButtonVars,
          ...baseStyles,
        }}
      >
        {children}
      </BaseStyles>
    </ThemeProvider>
  );
}
