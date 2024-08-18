/*
 * Copyright (c) 2023-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Main entry point for Datalayer.
 */
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RunIndex, LoginFormCLI, BenchmarkExample } from '@datalayer/run';

import '../style/index.css';

export const DatalayerApp = (): JSX.Element => {
  const pathname = window.location.pathname;
  const [view, setView] = useState<'benchmarks' | 'login' | 'webapps'>();
  useEffect(() => {
    if (pathname === '/') {
      setView('webapps');
    }
    else if (pathname === '/datalayer/login/cli') {
      setView('login');
    }
    else if (pathname === '/datalayer/benchmarks') {
      setView('benchmarks');
    }
  }, [pathname])
  return (
    <>
      { view === 'webapps' && <RunIndex /> }
      { view === 'login' && <MemoryRouter initialEntries={["/datalayer/login/cli"]}>
          <LoginFormCLI baseRoute='datalayer/login' />
        </MemoryRouter>
      }
      { view === 'benchmarks' && <MemoryRouter initialEntries={["/datalayer/benchmarks"]}>
          <Routes>
            <Route path="/datalayer/benchmarks" element={<BenchmarkExample/>}/>
          </Routes>
        </MemoryRouter>
      }
    </>
  );
}

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(<DatalayerApp/>);
