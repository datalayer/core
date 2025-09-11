/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import {
  BaseStyles,
  ThemeProvider as PrimerThemeProvider,
  ThemeProviderProps,
} from '@primer/react';

export interface IDatalayerThemeProviderProps extends ThemeProviderProps {
  /**
   * Base styles.
   */
  baseStyles?: CSSProperties;
}

export function DatalayerThemeProvider(
  props: React.PropsWithChildren<IDatalayerThemeProviderProps>,
): JSX.Element {
  const { children, colorMode, baseStyles, ...rest } = props;
  return (
    <PrimerThemeProvider colorMode={colorMode} {...rest}>
      <BaseStyles
        style={{
          backgroundColor: 'var(--bgColor-default)',
          color: 'var(--fgColor-default)',
          fontSize: 'var(--text-body-size-medium)',
          ...baseStyles,
        }}
      >
        {children}
      </BaseStyles>
    </PrimerThemeProvider>
  );
}
