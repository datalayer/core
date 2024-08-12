/*
 * Copyright (c) 2023-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Main entry point for Jupyter Kernels.
 */
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { LoginFormCLI } from '@datalayer/run';

import '../style/index.css';

export const LoginCLIApp = (): JSX.Element => {
  return (
    <>
      <MemoryRouter initialEntries={[
        "/login/cli"
      ]}>
        <LoginFormCLI baseRoute='login' />
      </MemoryRouter>    
    </>
  );
}

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(<LoginCLIApp/>);
