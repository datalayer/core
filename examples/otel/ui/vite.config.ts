import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // WebSocket endpoint → direct to OTEL service (port 7800)
      '/api/otel/v1/ws': {
        target: 'http://localhost:7800',
        changeOrigin: true,
        ws: true,
      },
      // REST endpoints → example FastAPI proxy (port 8600)
      '/api': {
        target: 'http://localhost:8600',
        changeOrigin: true,
      },
    },
  },
});
