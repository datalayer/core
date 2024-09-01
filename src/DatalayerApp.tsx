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
import { RunIndex, LoginFormCLI, BenchmarksExample, KernelsExample } from '@datalayer/run';

import '../style/index.css';

type ViewType = 'benchmarks' | 'kernels' | 'web' | 'login' | 'root';

export const DatalayerApp = (): JSX.Element => {
  const pathname = window.location.pathname;
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    if (pathname === '/') {
      setView('root');
      window.location.href = "/lab";
    }
    if (pathname === '/datalayer/web') {
      setView('web');
    }
    if (pathname === '/datalayer/kernels') {
      setView('kernels');
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
      { view === 'root' && (
        <></>
      )}
      { view === 'web' && (
        <RunIndex />
      )}
      { view === 'kernels' && (
        <KernelsExample memoryRouter={true} baseRoute="datalayer" />
      )}
      { view === 'benchmarks' && (
        <BenchmarksExample memoryRouter={true} baseRoute="datalayer" />
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
