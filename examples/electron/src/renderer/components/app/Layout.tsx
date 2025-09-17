/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/app/Layout
 * @description Application layout wrapper component providing theme providers.
 */

import React from 'react';
import { JupyterReactTheme } from '@datalayer/jupyter-react';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { AppLayoutProps } from '../../../shared/types';

/**
 * Application layout component that wraps the app with theme providers.
 * Provides Primer theme, base styles, and Jupyter React theme.
 * @component
 * @param props - Component props
 * @param props.children - Child components to render within the layout
 * @returns Themed application layout
 */
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
