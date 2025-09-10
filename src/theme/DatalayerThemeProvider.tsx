/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import {
  BaseStyles,
  ThemeProvider as PrimerThemeProvider,
  ThemeProviderProps,
} from '@primer/react';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  jupyterLabTheme,
  loadJupyterConfig,
  //  useJupyterReactStore,
} from '@datalayer/jupyter-react';
import { datalayerTheme } from '../theme';
import { useRuntimesStore } from '../state';

export interface IDatalayerThemeProviderProps extends ThemeProviderProps {
  /**
   * Base styles
   */
  baseStyles?: CSSProperties;
}

/**
 * ThemeProvider component changing color mode with JupyterLab theme
 * if embedded in Jupyter or with the browser color scheme preference.
 */
export function DatalayerThemeProvider(
  props: React.PropsWithChildren<IDatalayerThemeProviderProps>,
): JSX.Element {
  const { children, colorMode: colormodeProps, baseStyles, ...rest } = props;
  const { jupyterLabAdapter } = useRuntimesStore();
  //  const { colormode: colormodeJupyterReact } = useJupyterReactStore();
  const [colormode, setColormode] = useState(colormodeProps ?? 'light');
  const [inJupyterLab, setInJupterLab] = useState<boolean | undefined>(
    undefined,
  );
  useEffect(() => {
    const config = loadJupyterConfig();
    const { insideJupyterLab } = config;
    setInJupterLab(insideJupyterLab);
  }, []);
  /*
  useEffect(() => {
    setColormode(colormodeJupyterReact);
  }, [colormodeJupyterReact]);
  */
  useEffect(() => {
    if (inJupyterLab !== undefined) {
      function colorSchemeFromMedia({ matches }: { matches: boolean }) {
        setColormode(matches ? 'dark' : 'light');
      }
      function updateColorMode(themeManager: IThemeManager) {
        setColormode(
          themeManager.theme && !themeManager.isLight(themeManager.theme)
            ? 'dark'
            : 'light',
        );
      }
      if (inJupyterLab) {
        const themeManager = jupyterLabAdapter?.service(
          '@jupyterlab/apputils-extension:themes',
        ) as IThemeManager;
        if (themeManager) {
          updateColorMode(themeManager);
          themeManager.themeChanged.connect(updateColorMode);
          return () => {
            themeManager.themeChanged.disconnect(updateColorMode);
          };
        }
      } else {
        colorSchemeFromMedia({
          matches: window.matchMedia('(prefers-color-scheme: dark)').matches,
        });
        window
          .matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', colorSchemeFromMedia);
        return () => {
          window
            .matchMedia('(prefers-color-scheme: dark)')
            .removeEventListener('change', colorSchemeFromMedia);
        };
      }
    }
  }, [inJupyterLab, jupyterLabAdapter]);
  return inJupyterLab !== undefined ? (
    <PrimerThemeProvider
      colorMode={colormode}
      theme={inJupyterLab ? jupyterLabTheme : datalayerTheme}
      {...rest}
    >
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
  ) : (
    <></>
  );
}
