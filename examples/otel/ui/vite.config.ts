import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Default platform URL – overridden by DATALAYER_RUN_URL env var.
const RUN_URL = process.env.DATALAYER_RUN_URL || 'https://prod1.datalayer.run';
// OTEL service URL – falls back to RUN_URL so no local proxy is needed.
const OTEL_URL = process.env.DATALAYER_OTEL_RUN_URL || RUN_URL;

export default defineConfig(({ command }: ConfigEnv) => {
  // In dev (vite serve) use empty base URL so all API calls are relative and
  // routed through the Vite proxy → local FastAPI server (port 8600), which in
  // turn forwards to the Datalayer platform using DATALAYER_API_KEY from env.
  // In production builds use the absolute OTEL service URL.
  const otelBaseUrl = command === 'serve' ? '' : OTEL_URL;

  return {
    plugins: [react()],
    define: {
      // REST base URL: empty in dev so browser uses relative paths → Vite proxy →
      // local FastAPI (port 8600) → Datalayer platform (auth via DATALAYER_API_KEY).
      // Absolute in prod builds so the SPA talks to the platform directly.
      __DATALAYER_OTEL_URL__: JSON.stringify(otelBaseUrl),
      // WebSocket base URL: always the absolute platform OTEL URL because the
      // local FastAPI server does not implement a WebSocket endpoint.  The WS
      // connection authenticates via the `?token=` query parameter (JWT), so no
      // per-request auth header is needed.
      __DATALAYER_OTEL_WS_URL__: JSON.stringify(OTEL_URL),
    },
    server: {
      port: 5173,
      proxy: {
        // Signal generators + OTEL read proxies → local FastAPI backend (port 8600).
        // The local server uses DATALAYER_API_KEY from env so the browser does not
        // need to forward auth credentials to the Datalayer platform directly.
        '/api/generate': {
          target: 'http://localhost:8600',
          changeOrigin: true,
        },
        '/api/otel': {
          target: 'http://localhost:8600',
          changeOrigin: true,
        },
        // IAM login endpoint → Datalayer platform IAM service (needed for sign-in).
        '/api/iam': {
          target: RUN_URL,
          changeOrigin: true,
          secure: true,
        },
        // All other REST endpoints → Datalayer platform.
        '/api': {
          target: RUN_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
