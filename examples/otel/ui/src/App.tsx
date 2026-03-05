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

import React, { useCallback, useRef, useState } from 'react';
import { Box } from '@datalayer/primer-addons';
import { Text } from '@primer/react';
import { setupPrimerPortals } from '@datalayer/primer-addons/lib/utils/Portals';
import '../style/primer-primitives.css';
import { ThemedProvider } from './stores/themedProvider';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './LoginPage';
import { OtelHeader } from './header';
import { ThemeSwitcher } from './header/ThemeSwitcher';
import { DashboardView, SqlView } from './views';

// Register document.body as the Primer portal root BEFORE React renders,
// so that portals (ActionMenu overlays, Dialogs) inherit theme tokens
// from the very first paint.
setupPrimerPortals();

// REST requests use a relative base URL so that Vite's proxy (dev) or the
// same-origin server (prod) forwards /api/otel/* correctly. The Vite proxy
// is configured in vite.config.ts to forward /api/otel → DATALAYER_OTEL_RUN_URL.
const BASE_URL = '';

// WebSocket connects directly to the OTEL service URL, bypassing the Vite WS
// proxy which is unreliable for wss:// targets.
// __DATALAYER_OTEL_URL__ is injected at build time by vite.config.ts.
declare const __DATALAYER_OTEL_URL__: string;
const WS_BASE_URL: string = __DATALAYER_OTEL_URL__;

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
  const [view, setView] = useState<'dashboard' | 'sql'>('dashboard');

  const handleSignalRef = useCallback(
    (setter: (s: 'traces' | 'logs' | 'metrics') => void) => {
      signalSetterRef.current = setter;
    },
    [],
  );

  const handleNavigate = useCallback(
    (signal: 'traces' | 'logs' | 'metrics') => {
      setView('dashboard');
      signalSetterRef.current?.(signal);
    },
    [],
  );

  const TAB_SX = (active: boolean) => ({
    px: 3,
    py: 2,
    cursor: 'pointer',
    fontSize: 1,
    fontWeight: active ? 'bold' : 'normal',
    color: active ? 'accent.fg' : 'fg.muted',
    borderBottom: '2px solid',
    borderColor: active ? 'accent.fg' : 'transparent',
    '&:hover': { color: 'fg.default' },
  });

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
      {/* ── View tab bar ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          bg: 'canvas.default',
          borderBottom: '1px solid',
          borderColor: 'border.default',
          flexShrink: 0,
        }}
      >
        <Box sx={TAB_SX(view === 'dashboard')} onClick={() => setView('dashboard')}>
          <Text>Live</Text>
        </Box>
        <Box sx={TAB_SX(view === 'sql')} onClick={() => setView('sql')}>
          <Text>SQL</Text>
        </Box>
      </Box>
      {/* ── View content ── */}
      {view === 'dashboard' ? (
        <DashboardView
          baseUrl={BASE_URL}
          wsBaseUrl={WS_BASE_URL}
          token={token}
          autoRefreshMs={5000}
          defaultSignal="traces"
          limit={200}
          onSignalRef={handleSignalRef}
        />
      ) : (
        <SqlView baseUrl={BASE_URL} token={token} />
      )}
    </Box>
  );
};
