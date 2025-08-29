/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import commonjs from '@rollup/plugin-commonjs';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readFileSync } from 'fs';
import importAsString from 'vite-plugin-string';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      {
        name: 'copy-static-files',
        closeBundle() {
          // Ensure dist/main directory exists
          try {
            mkdirSync(resolve(__dirname, 'dist/main'), { recursive: true });
            // Copy about.html to dist/main
            copyFileSync(
              resolve(__dirname, 'src/main/about.html'),
              resolve(__dirname, 'dist/main/about.html')
            );
          } catch (err) {
            console.error('Failed to copy static files:', err);
          }
        },
      },
    ],
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
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      global: 'globalThis',
    },
    publicDir: '../../resources',
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
        plugins: [
          commonjs({
            transformMixedEsModules: true, // Handle mixed CJS/ESM modules
            include: [
              /node_modules/,
              /\.js$/,
            ],
            requireReturnsDefault: 'auto',
          }),
        ],
        onwarn(warning, warn) {
          // Suppress "use of eval" warnings
          if (warning.message.includes('Use of eval')) return;
          warn(warning);
        },
      },
    },
    plugins: [
      react({
        jsxRuntime: 'automatic', // Use automatic JSX runtime to avoid CJS/ESM issues
      }),
      {
        name: 'fix-jupyterlab-deep-imports',
        resolveId(source) {
          // Handle deep imports from @jupyterlab/services
          if (source.startsWith('@jupyterlab/services/lib/')) {
            const path = source.replace('@jupyterlab/services/lib/', '');
            return resolve(__dirname, `../../node_modules/@jupyterlab/services/lib/${path}`);
          }
          return null;
        },
      },
      {
        name: 'fix-require-statements',
        enforce: 'pre',
        transform(code, id) {
          // Replace require("../package.json").version with a hardcoded version
          if (code.includes('require("../package.json").version')) {
            return code.replace(
              /require\("\.\.\/package\.json"\)\.version/g,
              '"1.0.0"'
            );
          }
          return null;
        },
      },
      {
        name: 'fix-raw-css-imports',
        enforce: 'pre',
        transform(code, id) {
          // Fix the import in themesplugins.js
          if (id.includes('themesplugins.js')) {
            // Replace the problematic import with a dummy value
            return code.replace(
              "import scrollbarStyleText from '../style/scrollbar.raw.css';",
              "const scrollbarStyleText = '';"
            );
          }
          return null;
        },
      },
      importAsString({
        include: ['**/*.raw.css', '**/*.raw.css?*'],
      }),
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
        'json5': resolve(__dirname, '../../node_modules/json5/lib/index.js'),
      },
    },
    optimizeDeps: {
      include: [
        'json5', 
        'react', 
        'react-dom', 
        'react/jsx-runtime',
        '@jupyterlab/services',
        '@datalayer/jupyter-react',
      ],
      exclude: [
        'next/navigation',
        'next/router',
        '@react-navigation/native',
        '@jupyterlite/pyodide-kernel',
        '@jupyterlab/apputils-extension',
      ],
      esbuildOptions: {
        loader: {
          '.js': 'jsx', // Help with React packages that use JSX in .js files
        },
      },
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
