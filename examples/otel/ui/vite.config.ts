import { defineConfig, ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Default platform URL – overridden by DATALAYER_RUN_URL env var.
const RUN_URL = process.env.DATALAYER_RUN_URL || 'https://prod1.datalayer.run';
// OTEL service URL – falls back to RUN_URL so no local proxy is needed.
const OTEL_URL = process.env.DATALAYER_OTEL_RUN_URL || RUN_URL;

export default defineConfig(({ command }: ConfigEnv) => {
  // Always use the absolute OTEL service URL so the browser talks to the
  // Datalayer platform directly (auth via JWT token query param / header).
  const otelBaseUrl = OTEL_URL;

  return {
    plugins: [
      react(),
      {
        name: 'strip-tilde-import-prefix',
        enforce: 'pre',
        async resolveId(source, importer) {
          if (!source.startsWith('~')) {
            return null;
          }
          const normalized = source.slice(1);
          const resolved = await this.resolve(normalized, importer, {
            skipSelf: true,
          });
          if (resolved) {
            return resolved.id;
          }
          return normalized;
        },
      },
      {
        name: 'raw-css-as-string',
        enforce: 'pre',
        async resolveId(source, importer) {
          if (!source.endsWith('.raw.css') || source.includes('?raw')) {
            return null;
          }
          const resolved = await this.resolve(source + '?raw', importer, {
            skipSelf: true,
          });
          if (resolved) {
            return resolved.id;
          }
          return null;
        },
      },
      {
        name: 'fix-text-query',
        enforce: 'pre',
        async resolveId(source, importer) {
          if (!source.includes('?text')) {
            return null;
          }
          const fixed = source.replace('?text', '?raw');
          const resolved = await this.resolve(fixed, importer, {
            skipSelf: true,
          });
          if (resolved) {
            return resolved.id;
          }
          return fixed;
        },
      },
    ],
    resolve: {
      alias: [
        {
          find: /^~(.*)$/,
          replacement: '$1',
        },
      ],
    },
    assetsInclude: ['**/*.raw.css'],
    define: {
      global: 'globalThis',
      __webpack_public_path__: '""',
      'process.env': {},
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
        // Signal generators → local FastAPI backend (port 8600).
        '/api/generate': {
          target: 'http://localhost:8600',
          changeOrigin: true,
        },
        // OTEL read proxies → Datalayer platform (browser sends JWT directly).
        '/api/otel': {
          target: RUN_URL,
          changeOrigin: true,
          secure: true,
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
