import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    define: {
      __webpack_public_path__: '""',
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
        external: [
          'next/navigation',
          'next/router',
          'next/link',
          '@react-navigation/native',
          '@react-navigation/stack',
          /\.whl$/,
        ],
      },
    },
    plugins: [
      react(),
      {
        name: 'handle-special-imports',
        transform(code, id) {
          if (id.endsWith('.whl')) {
            // Skip .whl files
            return '';
          }
          // Handle service-worker?text imports
          if (id.includes('service-worker') && id.includes('?text')) {
            return 'export default "";';
          }
        },
        resolveId(source) {
          // Handle service-worker?text imports
          if (source.includes('service-worker?text')) {
            return { id: source, external: false };
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@datalayer/core': resolve(__dirname, '../../lib'),
        '@primer/css': resolve(__dirname, '../../node_modules/@primer/css'),
        '@datalayer/jupyter-react': resolve(
          __dirname,
          '../../node_modules/@datalayer/jupyter-react'
        ),
        '~react-toastify': 'react-toastify',
      },
    },
    optimizeDeps: {
      include: ['json5'],
      exclude: [
        'next/navigation',
        'next/router',
        '@react-navigation/native',
        '@jupyterlite/pyodide-kernel',
      ],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://prod1.datalayer.run',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  },
});
