/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { JupyterReactTheme } from '@datalayer/jupyter-react';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { AppLayoutProps } from '../../../shared/types';

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <BaseStyles>
        <JupyterReactTheme>
          <Box
            sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
          >
            {children}
          </Box>
        </JupyterReactTheme>
      </BaseStyles>
    </ThemeProvider>
  );
};

export default AppLayout;
