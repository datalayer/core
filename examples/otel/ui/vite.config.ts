import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Default platform URL – overridden by DATALAYER_RUN_URL env var.
const RUN_URL = process.env.DATALAYER_RUN_URL || 'https://prod1.datalayer.run';
// OTEL service URL – falls back to RUN_URL so no local proxy is needed.
const OTEL_URL = process.env.DATALAYER_OTEL_RUN_URL || RUN_URL;

export default defineConfig({
  plugins: [react()],
  // Expose the OTEL service URL to client code so the WebSocket can connect
  // directly (bypassing the Vite proxy, which is unreliable for wss:// targets).
  define: {
    __DATALAYER_OTEL_URL__: JSON.stringify(OTEL_URL),
  },
  server: {
    port: 5173,
    proxy: {
      // IAM login endpoint → Datalayer platform IAM service
      '/api/iam': {
        target: RUN_URL,
        changeOrigin: true,
        secure: true,
      },
      // OTEL WebSocket endpoint
      '/api/otel/v1/ws': {
        target: OTEL_URL,
        changeOrigin: true,
        ws: true,
        ...(OTEL_URL.startsWith('https') ? { secure: true } : {}),
      },
      // OTEL REST endpoints
      '/api/otel': {
        target: OTEL_URL,
        changeOrigin: true,
        ...(OTEL_URL.startsWith('https') ? { secure: true } : {}),
      },
      // All other REST endpoints → Datalayer platform
      '/api': {
        target: RUN_URL,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
