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
 * If the user is not authenticated, the LoginPage is shown instead
 * of the dashboard.
 *
 * Split into:
 *  - header/  → OtelHeader (branding + signal generators + theme switcher)
 *  - views/   → DashboardView, TracesView, LogsView, MetricsView
 */

import React, { useCallback, useRef } from 'react';
import { Box } from '@datalayer/primer-addons';
import { setupPrimerPortals } from '@datalayer/primer-addons/lib/utils/Portals';
import '../style/primer-primitives.css';
import { ThemedProvider } from './stores/themedProvider';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './LoginPage';
import { OtelHeader } from './header';
import { ThemeSwitcher } from './header/ThemeSwitcher';
import { DashboardView } from './views';

// Register document.body as the Primer portal root BEFORE React renders,
// so that portals (ActionMenu overlays, Dialogs) inherit theme tokens
// from the very first paint.
setupPrimerPortals();

// Use the Vite proxy – all /api requests → FastAPI on port 8600
const BASE_URL = '';

export const App: React.FC = () => {
  const token = useAuthStore((s) => s.token);

  // If not authenticated, show the login page.
  if (!token) {
    return (
      <ThemedProvider>
        <LoginPage />
      </ThemedProvider>
    );
  }

  return (
    <ThemedProvider>
      <AuthenticatedApp token={token} />
    </ThemedProvider>
  );
};

/** The main dashboard, rendered only when the user has a valid token. */
const AuthenticatedApp: React.FC<{ token: string }> = ({ token }) => {
  // Hold the OtelLive signal setter so the header can navigate tabs.
  const signalSetterRef = useRef<((s: 'traces' | 'logs' | 'metrics') => void) | null>(null);

  const handleSignalRef = useCallback(
    (setter: (s: 'traces' | 'logs' | 'metrics') => void) => {
      signalSetterRef.current = setter;
    },
    [],
  );

  const handleNavigate = useCallback(
    (signal: 'traces' | 'logs' | 'metrics') => {
      signalSetterRef.current?.(signal);
    },
    [],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bg: 'canvas.default',
        color: 'fg.default',
      }}
    >
      <OtelHeader
        baseUrl={BASE_URL}
        token={token}
        trailing={<ThemeSwitcher />}
        onNavigate={handleNavigate}
      />
      <DashboardView
        baseUrl={BASE_URL}
        token={token}
        autoRefreshMs={5000}
        defaultSignal="traces"
        limit={200}
        onSignalRef={handleSignalRef}
      />
    </Box>
  );
};
