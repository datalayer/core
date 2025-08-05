/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';

export enum JupyterLabTheme {
  LIGHT = 'JupyterLab Light',
  DARK = 'JupyterLab Dark',
}

export const useJupyterLabTheme = (themeManager: IThemeManager): any => {
  const isLight = themeManager && themeManager.theme ? themeManager.isLight(themeManager.theme) : true;
  const [theme, setTheme] = useState(isLight ? JupyterLabTheme.LIGHT : JupyterLabTheme.DARK);
  useEffect(() => {
    const handleThemeChange = (newTheme: any, event: any): any => {
      setTheme(event.newValue);
    };
    themeManager?.themeChanged?.connect(handleThemeChange);
    return () => {
      themeManager?.themeChanged?.disconnect(handleThemeChange);
    };
  }, []);
  return theme;
}
