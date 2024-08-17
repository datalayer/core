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
import { LoginFormCLI, CoreExample } from '@datalayer/run';

import '../style/index.css';

export const DatalayerApp = (): JSX.Element => {
  const [view, setView] = useState<'login' | 'benchmarks'>();
  useEffect(() => {
    if (window.location.pathname === '/datalayer/login/cli') {
      setView('login');
    }
    if (window.location.pathname === '/datalayer/benchmarks') {
      setView('benchmarks');
    }
  }, [])
  return (
    <>
      { view === 'login' && <MemoryRouter initialEntries={[
          "/datalayer/login/cli",
        ]}>
          <LoginFormCLI baseRoute='datalayer/login' />
        </MemoryRouter>
      }
      { view === 'benchmarks' && <MemoryRouter initialEntries={[
          "/datalayer/benchmarks",
        ]}>
          <Routes>
            <Route path="/datalayer/benchmarks" element={<CoreExample/>}/>
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
