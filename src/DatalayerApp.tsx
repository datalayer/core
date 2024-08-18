/*
 * Copyright (c) 2023-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Main entry point for the Datalayer Application.
 */
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RunIndex, LoginFormCLI, BenchmarksExample } from '@datalayer/run';

import '../style/index.css';

type ViewType = 'benchmarks' | 'full' | 'login';

export const DatalayerApp = (): JSX.Element => {
  const pathname = window.location.pathname;
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    if (pathname === '/') {
      setView('full');
    }
    else if (pathname === '/datalayer/benchmarks') {
      setView('benchmarks');
    }
    else if (pathname === '/datalayer/login/cli') {
      setView('login');
    }
  }, [pathname])
  return (
    <>
      { view === 'full' && (
        <RunIndex /> 
      )}
      { view === 'benchmarks' && (
        <BenchmarksExample memoryRouter={true} baseRoute="datalayer/benchmarks" />
      )}
      { view === 'login' && (
        <MemoryRouter initialEntries={["/datalayer/login/cli"]}>
          <LoginFormCLI baseRoute='datalayer/login' />
        </MemoryRouter>
      )}
    </>
  );
}

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(<DatalayerApp/>);
