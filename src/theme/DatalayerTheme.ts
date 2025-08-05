/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { theme as primerTheme } from '@primer/react';
import cloneDeep from 'lodash/cloneDeep.js';
import merge from 'lodash/merge.js';

/**
 * Datalayer Theme for Primer React.
 */
const datalayerThemeDefs = {
  colorSchemes: {
    light: {
      colors: {
        btn: {
//          text: 'var(--jp-ui-font-color1, rgba(0, 0, 0, 0.87))',
//          bg: 'var(--jp-layout-color1, white)',
//          border: 'var(--jp-border-color1, #bdbdbd)',
//          hoverBg: 'var(--jp-layout-color2, #eee)',
//          hoverBorder: 'var(--jp-border-color1, #bdbdbd)',
//          activeBg: 'var(--jp-layout-color3, #bdbdbd)',
//          activeBorder: 'var(--jp-border-color1, #bdbdbd)',
//          selectedBg: 'var(--jp-layout-color0, white)',
//          counterBg: 'var(--jp-layout-color4, #757575)',
          primary: {
//            text: 'var(--jp-ui-inverse-font-color1, rgba(255, 255, 255, 1))',
            bg: 'var(--dla-color-green-dark)',
//            border: 'var(--dla-color-green-light)',
            hoverBg: 'var(--dla-color-grey)',
//            hoverBorder: 'var(--dla-color-green-light)',
            selectedBg: 'var(--dla-color-black)',
//            disabledText: 'var(--jp-ui-inverse-font-color2, rgba(255, 255, 255, 0.7))',
//            disabledBg: 'var(--jp-brand-color3, #c8e6c9)',
//            disabledBorder: 'var(--jp-border-color1, #bdbdbd)',
//            icon: 'var(--jp-ui-inverse-font-color2, rgba(255, 255, 255, 0.7))',
//            counterBg: 'var(--jp-inverse-layout-color3, #616161)',
          },
        },
      },
      shadows: {},
    },
    dark: {
      colors: {},
      shadows: {},
    }
  },
};

const { colorSchemes: primerSchemes, ...primerOthers } = cloneDeep(primerTheme);
const { colorSchemes: jupyterSchemes, ...datalayerOthers } = datalayerThemeDefs;

// Merge with the light theme to ensure all variables are defined (although the style may be ugly).
const theme = merge(primerOthers, datalayerOthers, {
  colorSchemes: { light: {}, dark: {} },
});
theme.colorSchemes.light = {
  colors: merge(primerSchemes.light.colors, jupyterSchemes.light.colors),
  shadows: merge(primerSchemes.light.shadows, jupyterSchemes.light.shadows),
};
theme.colorSchemes.dark = {
  colors: merge(primerSchemes.dark.colors, jupyterSchemes.dark.colors),
  shadows: merge(primerSchemes.dark.shadows, jupyterSchemes.dark.shadows),
};

export { theme as datalayerTheme };
