/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { treatAsCommonjs } from 'vite-plugin-treat-umd-as-commonjs';

export default defineConfig({
  plugins: [
    react(),
    treatAsCommonjs(),
    {
      name: 'raw-css-as-string',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (source.endsWith('.raw.css') && !source.includes('?raw')) {
          // rewrite import to append ?raw query
          const resolved = await this.resolve(source + '?raw', importer, {
            skipSelf: true,
          });
          if (resolved) return resolved.id;
          return null;
        }
        return null;
      },
    },
    {
      name: 'fix-text-query',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (source.includes('?text')) {
          const fixed = source.replace('?text', '?raw');
          const resolved = await this.resolve(fixed, importer, {
            skipSelf: true,
          });
          if (resolved) {
            return resolved.id;
          }
          return fixed;
        }
        return null;
      },
    },
  ],
  define: {
    global: 'globalThis',
    __webpack_public_path__: '""',
  },
  assetsInclude: ['**/*.whl', '**/*.raw.css', '**/*.lexical'],
  build: {
    outDir: 'datalayer_core/static',
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
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
  optimizeDeps: {
    include: ['crypto-browserify', 'buffer', 'json5'],
    exclude: ['keytar'],
    esbuildOptions: {
      loader: {
        '.whl': 'text',
        '.lexical': 'json',
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
