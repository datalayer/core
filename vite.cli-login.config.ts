/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { treatAsCommonjs } from 'vite-plugin-treat-umd-as-commonjs';

export default defineConfig({
  plugins: [react(), treatAsCommonjs()],
  define: {
    global: 'globalThis',
    __webpack_public_path__: '""',
  },
  build: {
    outDir: 'datalayer_core/static',
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: 'src/cli-login.tsx',
      name: 'DatalayerCLILogin',
      formats: ['iife'],
      fileName: () => 'cli.datalayer-core.js',
    },
    rollupOptions: {
      external: ['keytar'],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: '/src',
      },
      {
        find: /^~(.*)$/,
        replacement: '$1',
      },
    ],
  },
});
