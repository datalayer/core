import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The IAM service URL – defaults to prod1.datalayer.run.
const IAM_URL = process.env.DATALAYER_RUN_URL || 'https://prod1.datalayer.run';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // IAM login endpoint → Datalayer platform IAM service
      '/api/iam': {
        target: IAM_URL,
        changeOrigin: true,
        secure: true,
      },
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
