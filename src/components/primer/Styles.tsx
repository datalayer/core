/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { ThemeProvider, BaseStyles } from '@primer/react';
import { jupyterLabTheme } from '@datalayer/jupyter-react';

export const Styles = () => {
    return <>
      <ThemeProvider theme={jupyterLabTheme}>
        <BaseStyles/>
      </ThemeProvider>
    </>
}

export default Styles;
