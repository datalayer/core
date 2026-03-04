/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datalayer OTEL Example – Main application.
 *
 * Wrapped in ThemedProvider which reads theme + color-mode from
 * a Zustand store (persisted to localStorage), with a theme / color
 * mode switcher in the header.
 *
 * Split into:
 *  - header/  → OtelHeader (branding + signal generators + theme switcher)
 *  - views/   → DashboardView, TracesView, LogsView, MetricsView
 */

import React from 'react';
import { Box } from '@datalayer/primer-addons';
import { setupPrimerPortals } from '@datalayer/primer-addons/lib/utils/Portals';
import '../style/primer-primitives.css';
import { ThemedProvider } from './stores/themedProvider';
import { OtelHeader } from './header';
import { ThemeSwitcher } from './header/ThemeSwitcher';
import { DashboardView } from './views';

// Register document.body as the Primer portal root BEFORE React renders,
// so that portals (ActionMenu overlays, Dialogs) inherit theme tokens
// from the very first paint.
setupPrimerPortals();

// Use the Vite proxy – all /api requests → FastAPI on port 8600
const BASE_URL = '';

export const App: React.FC = () => (
  <ThemedProvider>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bg: 'canvas.default',
        color: 'fg.default',
      }}
    >
      <OtelHeader baseUrl={BASE_URL} trailing={<ThemeSwitcher />} />
      <DashboardView
        baseUrl={BASE_URL}
        autoRefreshMs={5000}
        defaultSignal="traces"
        limit={200}
      />
    </Box>
  </ThemedProvider>
);
