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
 * If the user is not authenticated, the SignInSimple page is shown instead
 * of the dashboard.
 *
 * Components come directly from @datalayer/core/views/otel (OtelHeader, views)
 * and @datalayer/primer-addons (ThemedProvider, ThemeSwitcher).
 */

import React, { useCallback, useRef, useState } from 'react';
import { Box } from '@datalayer/primer-addons';
import { Text } from '@primer/react';
import { TelescopeIcon } from '@primer/octicons-react';
import { setupPrimerPortals } from '@datalayer/primer-addons/lib/utils/Portals';
import '../style/primer-primitives.css';
import {
  ThemedProvider,
  ThemeSwitcher,
  useThemeStore,
} from '@datalayer/primer-addons';
import { useSimpleAuthStore as useAuthStore } from '@datalayer/core/lib/views/otel';
import { SignInSimple } from '@datalayer/core/lib/views/iam';
import {
  OtelHeader,
  DashboardView,
  SqlView,
  SystemView,
} from '@datalayer/core/lib/views/otel';

// Register document.body as the Primer portal root BEFORE React renders,
// so that portals (ActionMenu overlays, Dialogs) inherit theme tokens
// from the very first paint.
setupPrimerPortals();

// __DATALAYER_OTEL_URL__ is injected at build time by vite.config.ts.
// Both REST and WebSocket requests go directly to the OTEL backend – no proxy.
declare const __DATALAYER_OTEL_URL__: string;
const BASE_URL: string = __DATALAYER_OTEL_URL__;
const WS_BASE_URL: string = __DATALAYER_OTEL_URL__;

export const App: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  // If not authenticated, show the sign-in page.
  if (!token) {
    return (
      <ThemedProvider useStore={useThemeStore}>
        <SignInSimple
          onSignIn={setAuth}
          title="Datalayer OTEL"
          description="Sign in to access the observability dashboard."
          leadingIcon={<TelescopeIcon size={24} />}
        />
      </ThemedProvider>
    );
  }

  return (
    <ThemedProvider useStore={useThemeStore}>
      <AuthenticatedApp token={token} />
    </ThemedProvider>
  );
};

/** The main dashboard, rendered only when the user has a valid token. */
const AuthenticatedApp: React.FC<{ token: string }> = ({ token }) => {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  // Hold the OtelLive signal setter so the header can navigate tabs.
  const signalSetterRef = useRef<((s: 'traces' | 'logs' | 'metrics') => void) | null>(null);
  const [view, setView] = useState<'dashboard' | 'sql' | 'system'>(() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)otel_view=([^;]+)/);
      if (m && (m[1] === 'dashboard' || m[1] === 'sql' || m[1] === 'system')) return m[1] as 'dashboard' | 'sql' | 'system';
    } catch { /* ignore */ }
    return 'dashboard';
  });

  const switchView = (v: 'dashboard' | 'sql' | 'system') => {
    try { document.cookie = `otel_view=${v};path=/;max-age=31536000`; } catch { /* ignore */ }
    setView(v);
  };

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
        overflow: 'hidden',
        bg: 'canvas.default',
        color: 'fg.default',
      }}
    >
      <OtelHeader
        token={token}
        trailing={<ThemeSwitcher useStore={useThemeStore} />}
        onNavigate={handleNavigate}
        onSignOut={clearAuth}
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
        <Box sx={TAB_SX(view === 'dashboard')} onClick={() => switchView('dashboard')}>
          <Text>Live</Text>
        </Box>
        <Box sx={TAB_SX(view === 'sql')} onClick={() => switchView('sql')}>
          <Text>SQL</Text>
        </Box>
        <Box sx={TAB_SX(view === 'system')} onClick={() => switchView('system')}>
          <Text>System</Text>
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
      ) : view === 'sql' ? (
        <SqlView baseUrl={BASE_URL} token={token} />
      ) : (
        <SystemView baseUrl={BASE_URL} token={token} />
      )}
    </Box>
  );
};
