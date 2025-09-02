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
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'production'
      ),
      global: 'globalThis',
    },
    esbuild: {
      // Ensure native globals are preserved
      keepNames: true,
    },
    publicDir: '../../resources',
    build: {
      outDir: 'dist/renderer',
      target: 'esnext', // Use modern JS to avoid polyfill conflicts
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
          '@jupyterlite/pyodide-kernel',
          '@jupyterlite/kernel',
          /\.whl$/,
        ],
        plugins: [
          commonjs({
            transformMixedEsModules: true, // Handle mixed CJS/ESM modules
            include: [/node_modules/, /\.js$/],
            requireReturnsDefault: 'auto',
          }),
        ] as any,
        onwarn(warning, warn) {
          // Suppress "use of eval" warnings
          if (warning.message.includes('Use of eval')) return;
          warn(warning);
        },
      },
    },
    plugins: [
      {
        name: 'node-builtins-polyfill',
        enforce: 'pre',
        resolveId(id) {
          const builtins = [
            'path',
            'fs',
            'os',
            'util',
            'crypto',
            'stream',
            'events',
            'buffer',
          ];
          if (builtins.includes(id)) {
            return {
              id: `\0node-builtin:${id}`,
              external: false,
              moduleSideEffects: false,
            };
          }
          return null;
        },
        load(id) {
          if (id.startsWith('\0node-builtin:')) {
            const name = id.slice(14);

            if (name === 'path') {
              return `
                const path = {
                  join: (...parts) => parts.filter(p => p && p !== '.').join('/').replace(/\\/+/g, '/'),
                  dirname: (p) => { const i = p.lastIndexOf('/'); return i === -1 ? '.' : p.substring(0, i) || '/'; },
                  basename: (p, ext) => { const n = p.substring(p.lastIndexOf('/') + 1); return ext && n.endsWith(ext) ? n.slice(0, -ext.length) : n; },
                  extname: (p) => { const d = p.lastIndexOf('.'); const s = p.lastIndexOf('/'); return d > s ? p.substring(d) : ''; },
                  resolve: (...paths) => '/' + paths.filter(p => p).join('/').replace(/\\/+/g, '/'),
                  relative: (from, to) => to,
                  sep: '/',
                  delimiter: ':',
                  parse: function(p) { return { root: '', dir: this.dirname(p), base: this.basename(p), ext: this.extname(p), name: this.basename(p, this.extname(p)) }; }
                };
                export default path;
                export const { join, dirname, basename, extname, resolve, relative, sep, delimiter, parse } = path;
              `;
            }

            if (name === 'fs') {
              return `
                const fs = {
                  existsSync: () => false,
                  readFileSync: () => '',
                  writeFileSync: () => {},
                  mkdirSync: () => {},
                  readdirSync: () => [],
                  statSync: () => ({ isFile: () => false, isDirectory: () => false }),
                  unlinkSync: () => {},
                  rmSync: () => {},
                  promises: {
                    readFile: async () => '',
                    writeFile: async () => {},
                    mkdir: async () => {},
                    readdir: async () => [],
                    stat: async () => ({ isFile: () => false, isDirectory: () => false }),
                    unlink: async () => {},
                    rm: async () => {}
                  }
                };
                export default fs;
                export const { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, rmSync, promises } = fs;
              `;
            }

            if (name === 'os') {
              return `
                const os = {
                  platform: () => 'darwin',
                  arch: () => 'arm64',
                  release: () => '1.0.0',
                  type: () => 'Darwin',
                  tmpdir: () => '/tmp',
                  homedir: () => '/home',
                  hostname: () => 'localhost',
                  endianness: () => 'LE'
                };
                export default os;
                export const { platform, arch, release, type, tmpdir, homedir, hostname, endianness } = os;
              `;
            }

            // Return empty stub for other modules
            return `
              const stub = {};
              export default stub;
            `;
          }
          return null;
        },
      },
      {
        name: 'resolve-jupyterlab-services',
        enforce: 'pre',
        resolveId(id) {
          // Intercept @jupyterlab/services imports
          if (id === '@jupyterlab/services') {
            // Return a virtual module ID
            return '\0virtual:jupyterlab-services';
          }
          return null;
        },
        load(id) {
          // Provide a virtual module that re-exports everything correctly
          if (id === '\0virtual:jupyterlab-services') {
            return `
              // Import and re-export ESM modules
              import * as managerModule from '@jupyterlab/services/lib/manager';
              import * as serverConnectionModule from '@jupyterlab/services/lib/serverconnection';
              import * as kernelModule from '@jupyterlab/services/lib/kernel';
              import * as kernelMessagesModule from '@jupyterlab/services/lib/kernel/messages';
              import * as sessionModule from '@jupyterlab/services/lib/session';
              import * as contentsModule from '@jupyterlab/services/lib/contents';
              import * as configModule from '@jupyterlab/services/lib/config';
              import * as kernelspecModule from '@jupyterlab/services/lib/kernelspec';
              import * as nbconvertModule from '@jupyterlab/services/lib/nbconvert';
              import * as settingModule from '@jupyterlab/services/lib/setting';
              import * as terminalModule from '@jupyterlab/services/lib/terminal';
              import * as userModule from '@jupyterlab/services/lib/user';
              import * as workspaceModule from '@jupyterlab/services/lib/workspace';
              import * as eventModule from '@jupyterlab/services/lib/event';
              import * as basemanagerModule from '@jupyterlab/services/lib/basemanager';

              // Export specific items - try both CommonJS and ESM patterns
              export const ServiceManager = managerModule.ServiceManager || managerModule.default?.ServiceManager;
              export const ServerConnection = serverConnectionModule.ServerConnection || serverConnectionModule.default?.ServerConnection;
              export const KernelMessage = kernelMessagesModule;
              export const Kernel = kernelModule;

              // Re-export everything from each module
              export * from '@jupyterlab/services/lib/kernel';
              export * from '@jupyterlab/services/lib/session';
              export * from '@jupyterlab/services/lib/contents';
              export * from '@jupyterlab/services/lib/manager';
              export * from '@jupyterlab/services/lib/config';
              export * from '@jupyterlab/services/lib/kernelspec';
              export * from '@jupyterlab/services/lib/nbconvert';
              export * from '@jupyterlab/services/lib/serverconnection';
              export * from '@jupyterlab/services/lib/setting';
              export * from '@jupyterlab/services/lib/terminal';
              export * from '@jupyterlab/services/lib/user';
              export * from '@jupyterlab/services/lib/workspace';
              export * from '@jupyterlab/services/lib/event';
              export * from '@jupyterlab/services/lib/basemanager';
            `;
          }
          return null;
        },
      },
      {
        name: 'resolve-vscode-jsonrpc',
        enforce: 'pre',
        resolveId(id) {
          // Intercept vscode-jsonrpc deep imports
          if (id === 'vscode-jsonrpc/lib/common/messageReader') {
            return '\0virtual:vscode-jsonrpc-messageReader';
          }
          if (id === 'vscode-jsonrpc/lib/common/messageWriter') {
            return '\0virtual:vscode-jsonrpc-messageWriter';
          }
          return null;
        },
        load(id) {
          // Provide virtual modules that properly export from CommonJS
          if (id === '\0virtual:vscode-jsonrpc-messageReader') {
            return `
              import * as messageReader from 'vscode-jsonrpc/lib/common/messageReader.js';
              export const AbstractMessageReader = messageReader.AbstractMessageReader;
              export const MessageReader = messageReader.MessageReader;
              export const ReadableStreamMessageReader = messageReader.ReadableStreamMessageReader;
            `;
          }
          if (id === '\0virtual:vscode-jsonrpc-messageWriter') {
            return `
              import * as messageWriter from 'vscode-jsonrpc/lib/common/messageWriter.js';
              export const AbstractMessageWriter = messageWriter.AbstractMessageWriter;
              export const MessageWriter = messageWriter.MessageWriter;
              export const WriteableStreamMessageWriter = messageWriter.WriteableStreamMessageWriter;
            `;
          }
          return null;
        },
      },
      {
        name: 'fix-nodejs-imports-in-bundle',
        generateBundle(options, bundle) {
          // Fix Node.js imports in the final bundle
          Object.keys(bundle).forEach(fileName => {
            const chunk = bundle[fileName];
            if (chunk.type === 'chunk' && chunk.code) {
              let modified = false;
              let code = chunk.code;

              // Define path polyfill
              const pathPolyfill = `
                const pathPolyfill = {
                  join: function(...parts) { return parts.filter(part => part && part !== '.').join('/').replace(/\\/+/g, '/'); },
                  dirname: function(path) { const lastSlash = path.lastIndexOf('/'); return lastSlash === -1 ? '.' : path.substring(0, lastSlash) || '/'; },
                  basename: function(path, ext) { const name = path.substring(path.lastIndexOf('/') + 1); return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name; },
                  extname: function(path) { const dotIndex = path.lastIndexOf('.'); const slashIndex = path.lastIndexOf('/'); return dotIndex > slashIndex ? path.substring(dotIndex) : ''; },
                  resolve: function(...paths) { return this.join('/', ...paths); },
                  relative: function(from, to) { return to; },
                  sep: '/', delimiter: ':',
                  parse: function(path) { const ext = this.extname(path); const base = this.basename(path); const name = this.basename(path, ext); const dir = this.dirname(path); return { root: '', dir, base, ext, name }; }
                };
              `;

              // Replace all forms of path imports
              // Handle: import 'path'
              if (
                code.includes("import 'path'") ||
                code.includes('import "path"')
              ) {
                code = code.replace(
                  /import\s+['"]path['"];?/g,
                  '/* path polyfill injected */'
                );
                modified = true;
              }

              // Handle: import path from 'path'
              if (
                code.includes("from 'path'") ||
                code.includes('from "path"')
              ) {
                code = code.replace(
                  /import\s+(\w+)\s+from\s+['"]path['"];?/g,
                  (match, varName) => {
                    return `${pathPolyfill}\nconst ${varName} = pathPolyfill;`;
                  }
                );
                modified = true;
              }

              // Handle: import require$$X from 'path'
              if (
                code.includes('require$$') &&
                (code.includes("from 'path'") || code.includes('from "path"'))
              ) {
                code = code.replace(
                  /import\s+(require\$\$[\w$]+)\s+from\s+['"]path['"];?/g,
                  (match, varName) => {
                    return `${pathPolyfill}\nconst ${varName} = pathPolyfill;`;
                  }
                );
                modified = true;
              }

              // Handle: import * as path from 'path'
              if (
                code.includes('* as') &&
                (code.includes("from 'path'") || code.includes('from "path"'))
              ) {
                code = code.replace(
                  /import\s+\*\s+as\s+(\w+)\s+from\s+['"]path['"];?/g,
                  (match, varName) => {
                    return `${pathPolyfill}\nconst ${varName} = pathPolyfill;`;
                  }
                );
                modified = true;
              }

              // Handle other Node.js built-ins with similar patterns
              const nodeBuiltins = [
                'os',
                'util',
                'events',
                'crypto',
                'buffer',
                'stream',
                'fs',
              ];
              nodeBuiltins.forEach(builtin => {
                // Side-effect imports
                if (
                  code.includes(`import '${builtin}'`) ||
                  code.includes(`import "${builtin}"`)
                ) {
                  code = code.replace(
                    new RegExp(`import\\s+['"]${builtin}['"];?`, 'g'),
                    `/* ${builtin} stub */`
                  );
                  modified = true;
                }

                // Default imports
                if (
                  code.includes(`from '${builtin}'`) ||
                  code.includes(`from "${builtin}"`)
                ) {
                  code = code.replace(
                    new RegExp(
                      `import\\s+(\\w+|require\\$\\$[\\w\\$]+)\\s+from\\s+['"]${builtin}['"];?`,
                      'g'
                    ),
                    `const $1 = {};`
                  );
                  modified = true;
                }

                // Namespace imports
                if (
                  code.includes(`* as`) &&
                  (code.includes(`from '${builtin}'`) ||
                    code.includes(`from "${builtin}"`))
                ) {
                  code = code.replace(
                    new RegExp(
                      `import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s+['"]${builtin}['"];?`,
                      'g'
                    ),
                    `const $1 = {};`
                  );
                  modified = true;
                }
              });

              if (modified) {
                chunk.code = code;
              }
            }
          });
        },
      },
      {
        name: 'fix-module-exports',
        renderChunk(code, chunk) {
          // Fix CommonJS default export assignments that fail with getters
          if (chunk.fileName.includes('index')) {
            let modified = code;

            // Replace any X.default = X pattern with try-catch
            modified = modified.replace(
              /([\w$]+)(\.default\s*=\s*\1);/g,
              `try { $1$2; } catch(e) { /* Ignore setter errors for $1.default */ }`
            );

            return modified !== code ? modified : null;
          }
          return null;
        },
      },
      {
        name: 'fix-lodash-bundling',
        renderChunk(code, chunk) {
          // Only fix lodash issues in the main bundle
          if (chunk.fileName.includes('index')) {
            let modified = code;

            // Comprehensive lodash polyfills for all the internal functions
            const lodashPolyfills = `
              // Save original constructors at the very beginning
              (function() {
                if (!globalThis._OriginalUint8Array) {
                  globalThis._OriginalUint8Array = globalThis.Uint8Array || window.Uint8Array;
                  globalThis._OriginalMap = globalThis.Map || window.Map;
                  globalThis._OriginalSet = globalThis.Set || window.Set;
                  globalThis._OriginalWeakMap = globalThis.WeakMap || window.WeakMap;
                  globalThis._OriginalWeakSet = globalThis.WeakSet || window.WeakSet;
                  globalThis._OriginalDataView = globalThis.DataView || window.DataView;
                  globalThis._OriginalPromise = globalThis.Promise || window.Promise;
                  globalThis._OriginalSymbol = globalThis.Symbol || window.Symbol;

                  // Ensure Uint8Array is always available
                  if (!globalThis.Uint8Array) globalThis.Uint8Array = globalThis._OriginalUint8Array;
                  if (!window.Uint8Array) window.Uint8Array = globalThis._OriginalUint8Array;
                }
              })();

              // Lodash internal function polyfills
              if (typeof baseGetTag$1 === 'undefined') {
                var baseGetTag$1 = function(value) {
                  if (value == null) {
                    return value === undefined ? '[object Undefined]' : '[object Null]';
                  }
                  return Object.prototype.toString.call(value);
                };
              }

              // Ensure global constructors are available (handle multiple variations)
              if (typeof Map$1 === 'undefined') var Map$1 = _OriginalMap;
              if (typeof Set$1 === 'undefined') var Set$1 = _OriginalSet;
              if (typeof WeakMap$1 === 'undefined') var WeakMap$1 = _OriginalWeakMap;
              if (typeof WeakSet$1 === 'undefined') var WeakSet$1 = _OriginalWeakSet;
              if (typeof DataView$1 === 'undefined') var DataView$1 = _OriginalDataView;
              if (typeof Promise$1 === 'undefined') var Promise$1 = _OriginalPromise;
              if (typeof Symbol$1 === 'undefined') var Symbol$1 = _OriginalSymbol;
              if (typeof Uint8Array$1 === 'undefined') var Uint8Array$1 = _OriginalUint8Array;

              // Handle all numbered variations ($1 through $10)
              for (let i = 1; i <= 10; i++) {
                if (typeof window['Map$' + i] === 'undefined') window['Map$' + i] = globalThis._OriginalMap;
                if (typeof window['Set$' + i] === 'undefined') window['Set$' + i] = globalThis._OriginalSet;
                if (typeof window['WeakMap$' + i] === 'undefined') window['WeakMap$' + i] = globalThis._OriginalWeakMap;
                if (typeof window['WeakSet$' + i] === 'undefined') window['WeakSet$' + i] = globalThis._OriginalWeakSet;
                if (typeof window['DataView$' + i] === 'undefined') window['DataView$' + i] = globalThis._OriginalDataView;
                if (typeof window['Promise$' + i] === 'undefined') window['Promise$' + i] = globalThis._OriginalPromise;
                if (typeof window['Symbol$' + i] === 'undefined') window['Symbol$' + i] = globalThis._OriginalSymbol;
                if (typeof window['Uint8Array$' + i] === 'undefined') window['Uint8Array$' + i] = globalThis._OriginalUint8Array;

                if (typeof globalThis['Map$' + i] === 'undefined') globalThis['Map$' + i] = globalThis._OriginalMap;
                if (typeof globalThis['Set$' + i] === 'undefined') globalThis['Set$' + i] = globalThis._OriginalSet;
                if (typeof globalThis['WeakMap$' + i] === 'undefined') globalThis['WeakMap$' + i] = globalThis._OriginalWeakMap;
                if (typeof globalThis['WeakSet$' + i] === 'undefined') globalThis['WeakSet$' + i] = globalThis._OriginalWeakSet;
                if (typeof globalThis['DataView$' + i] === 'undefined') globalThis['DataView$' + i] = globalThis._OriginalDataView;
                if (typeof globalThis['Promise$' + i] === 'undefined') globalThis['Promise$' + i] = globalThis._OriginalPromise;
                if (typeof globalThis['Symbol$' + i] === 'undefined') globalThis['Symbol$' + i] = globalThis._OriginalSymbol;
                if (typeof globalThis['Uint8Array$' + i] === 'undefined') globalThis['Uint8Array$' + i] = globalThis._OriginalUint8Array;
              }

              // Make them available as regular vars too
              var Map$1 = globalThis._OriginalMap;
              var Map$2 = globalThis._OriginalMap;
              var Map$3 = globalThis._OriginalMap;
              var Map$4 = globalThis._OriginalMap;
              var Map$5 = globalThis._OriginalMap;

              var Set$1 = globalThis._OriginalSet;
              var Set$2 = globalThis._OriginalSet;
              var Set$3 = globalThis._OriginalSet;
              var Set$4 = globalThis._OriginalSet;
              var Set$5 = globalThis._OriginalSet;

              var Symbol$1 = globalThis._OriginalSymbol;
              var Symbol$2 = globalThis._OriginalSymbol;
              var Symbol$3 = globalThis._OriginalSymbol;
              var Symbol$4 = globalThis._OriginalSymbol;
              var Symbol$5 = globalThis._OriginalSymbol;

              var WeakMap$1 = globalThis._OriginalWeakMap;
              var WeakMap$2 = globalThis._OriginalWeakMap;
              var WeakMap$3 = globalThis._OriginalWeakMap;
              var WeakMap$4 = globalThis._OriginalWeakMap;
              var WeakMap$5 = globalThis._OriginalWeakMap;

              var WeakSet$1 = globalThis._OriginalWeakSet;
              var WeakSet$2 = globalThis._OriginalWeakSet;
              var WeakSet$3 = globalThis._OriginalWeakSet;
              var WeakSet$4 = globalThis._OriginalWeakSet;
              var WeakSet$5 = globalThis._OriginalWeakSet;

              var DataView$1 = globalThis._OriginalDataView;
              var DataView$2 = globalThis._OriginalDataView;
              var DataView$3 = globalThis._OriginalDataView;
              var DataView$4 = globalThis._OriginalDataView;
              var DataView$5 = globalThis._OriginalDataView;

              var Promise$1 = globalThis._OriginalPromise;
              var Promise$2 = globalThis._OriginalPromise;
              var Promise$3 = globalThis._OriginalPromise;
              var Promise$4 = globalThis._OriginalPromise;
              var Promise$5 = globalThis._OriginalPromise;

              var Uint8Array$1 = globalThis._OriginalUint8Array;
              var Uint8Array$2 = globalThis._OriginalUint8Array;
              var Uint8Array$3 = globalThis._OriginalUint8Array;
              var Uint8Array$4 = globalThis._OriginalUint8Array;
              var Uint8Array$5 = globalThis._OriginalUint8Array;

              // Additional lodash helpers
              if (typeof isObject$1 === 'undefined') {
                var isObject$1 = function(value) {
                  var type = typeof value;
                  return value != null && (type == 'object' || type == 'function');
                };
              }

              // Define toSource function (used by lodash internally)
              if (typeof toSource === 'undefined') {
                var toSource = function(func) {
                  if (func != null) {
                    try {
                      return Function.prototype.toString.call(func);
                    } catch (e) {}
                    try {
                      return (func + '');
                    } catch (e) {}
                  }
                  return '';
                };
              }

              // Define ListCache constructor (lodash internal)
              if (typeof ListCache === 'undefined') {
                function ListCache(entries) {
                  var index = -1,
                      length = entries == null ? 0 : entries.length;
                  this.clear();
                  while (++index < length) {
                    var entry = entries[index];
                    this.set(entry[0], entry[1]);
                  }
                }
                ListCache.prototype.clear = function() {
                  this.__data__ = [];
                  this.size = 0;
                };
                ListCache.prototype['delete'] = function(key) {
                  var data = this.__data__,
                      index = data.findIndex(function(e) { return e[0] === key; });
                  if (index < 0) return false;
                  data.splice(index, 1);
                  this.size--;
                  return true;
                };
                ListCache.prototype.get = function(key) {
                  var data = this.__data__,
                      index = data.findIndex(function(e) { return e[0] === key; });
                  return index < 0 ? undefined : data[index][1];
                };
                ListCache.prototype.has = function(key) {
                  return this.__data__.findIndex(function(e) { return e[0] === key; }) > -1;
                };
                ListCache.prototype.set = function(key, value) {
                  var data = this.__data__,
                      index = data.findIndex(function(e) { return e[0] === key; });
                  if (index < 0) {
                    this.size++;
                    data.push([key, value]);
                  } else {
                    data[index][1] = value;
                  }
                  return this;
                };
                globalThis.ListCache = ListCache;
                globalThis.ListCache$1 = ListCache;
                globalThis.ListCache$2 = ListCache;
                globalThis.ListCache$3 = ListCache;
              }

              // CRITICAL: Ensure global constructors are never overwritten
              // This must be at the end to restore any accidental overwrites
              if (!globalThis.Uint8Array || typeof globalThis.Uint8Array !== 'function') {
                globalThis.Uint8Array = globalThis._OriginalUint8Array;
              }
              if (!globalThis.Map || typeof globalThis.Map !== 'function') {
                globalThis.Map = globalThis._OriginalMap;
              }
              if (!globalThis.Set || typeof globalThis.Set !== 'function') {
                globalThis.Set = globalThis._OriginalSet;
              }
              if (!globalThis.WeakMap || typeof globalThis.WeakMap !== 'function') {
                globalThis.WeakMap = globalThis._OriginalWeakMap;
              }
              if (!globalThis.WeakSet || typeof globalThis.WeakSet !== 'function') {
                globalThis.WeakSet = globalThis._OriginalWeakSet;
              }
              if (!globalThis.DataView || typeof globalThis.DataView !== 'function') {
                globalThis.DataView = globalThis._OriginalDataView;
              }
              if (!globalThis.Promise || typeof globalThis.Promise !== 'function') {
                globalThis.Promise = globalThis._OriginalPromise;
              }
              if (!globalThis.Symbol || typeof globalThis.Symbol !== 'function') {
                globalThis.Symbol = globalThis._OriginalSymbol;
              }

              // Also protect window.Uint8Array (in browser context)
              if (typeof window !== 'undefined') {
                if (!window.Uint8Array || typeof window.Uint8Array !== 'function') {
                  window.Uint8Array = globalThis._OriginalUint8Array;
                }
              }
            `;

            // Add polyfills at the beginning of the file, after 'use strict'
            if (modified.includes("'use strict'")) {
              modified = modified.replace(
                "'use strict';",
                `'use strict';${lodashPolyfills}`
              );
            } else {
              modified = lodashPolyfills + modified;
            }

            // Wrap ALL Uint8Array constructor calls to ensure it's available
            modified = modified.replace(
              /new Uint8Array\(/g,
              'new (window.Uint8Array || globalThis.Uint8Array || Uint8Array)('
            );

            // Prevent Uint8Array from being overwritten - more careful approach
            if (
              modified.includes('Uint8Array =') &&
              !modified.includes('new Uint8Array')
            ) {
              // Find and comment out problematic reassignments
              modified = modified.replace(
                /^(\s*)(Uint8Array\s*=\s*[^;]+;)/gm,
                '$1/* $2 */'
              );
            }

            // Fix any var Uint8Array = statements
            modified = modified.replace(
              /var\s+Uint8Array\s*=\s*[^;]+;/g,
              '/* var Uint8Array assignment blocked */'
            );

            // Fix let Uint8Array = statements
            modified = modified.replace(
              /let\s+Uint8Array\s*=\s*[^;]+;/g,
              '/* let Uint8Array assignment blocked */'
            );

            // Fix const Uint8Array = statements that aren't legitimate uses
            modified = modified.replace(
              /const\s+Uint8Array\s*=\s*require[^;]+;/g,
              '/* const Uint8Array require blocked */'
            );

            // Inject ListCache polyfill right before it's used
            const listCachePolyfill = `
              if (typeof ListCache$2 === 'undefined' && typeof Map$3 === 'undefined') {
                var ListCache$2 = (function() {
                  function ListCache(entries) {
                    var index = -1, length = entries == null ? 0 : entries.length;
                    this.clear();
                    while (++index < length) {
                      var entry = entries[index];
                      this.set(entry[0], entry[1]);
                    }
                  }
                  ListCache.prototype.clear = function() {
                    this.__data__ = [];
                    this.size = 0;
                  };
                  ListCache.prototype['delete'] = function(key) {
                    var data = this.__data__, index = -1;
                    while (++index < data.length) {
                      if (data[index][0] === key) {
                        data.splice(index, 1);
                        this.size--;
                        return true;
                      }
                    }
                    return false;
                  };
                  ListCache.prototype.get = function(key) {
                    var data = this.__data__, index = -1;
                    while (++index < data.length) {
                      if (data[index][0] === key) {
                        return data[index][1];
                      }
                    }
                    return undefined;
                  };
                  ListCache.prototype.has = function(key) {
                    var data = this.__data__, index = -1;
                    while (++index < data.length) {
                      if (data[index][0] === key) {
                        return true;
                      }
                    }
                    return false;
                  };
                  ListCache.prototype.set = function(key, value) {
                    var data = this.__data__, index = -1;
                    while (++index < data.length) {
                      if (data[index][0] === key) {
                        data[index][1] = value;
                        return this;
                      }
                    }
                    this.size++;
                    data.push([key, value]);
                    return this;
                  };
                  return ListCache;
                })();
                var Map$3 = globalThis.Map || Map;
              }
            `;

            // Inject the polyfill before MapCache constructor usage
            modified = modified.replace(
              /function MapCache\$2\(/,
              listCachePolyfill + '\nfunction MapCache$2('
            );

            // Fix all instances of (Map$X || ListCache$Y) pattern
            modified = modified.replace(
              /new\s*\(Map\$(\d+)\s*\|\|\s*ListCache\$(\d+)\)/g,
              'new (globalThis.Map || globalThis.ListCache$$$2 || globalThis.ListCache)'
            );

            // Also fix without "new" keyword (in case it's used differently)
            modified = modified.replace(
              /\(Map\$(\d+)\s*\|\|\s*ListCache\$(\d+)\)/g,
              function (match, map, list) {
                // If it's not preceded by "new", provide the constructor reference
                if (!match.includes('new')) {
                  return `(globalThis.Map || globalThis.ListCache$$${list} || globalThis.ListCache)`;
                }
                return match;
              }
            );

            // Fix specific lodash require patterns - don't override if already defined
            modified = modified.replace(
              /var\s+DataView\$1\s*=\s*require\$\$[^,;]+/g,
              'DataView$1 = DataView$1 || globalThis.DataView || DataView'
            );
            modified = modified.replace(
              /([,\s])Map\$1\s*=\s*require\$\$[^,;]+/g,
              '$1Map$1 = Map$1 || globalThis.Map || Map'
            );
            modified = modified.replace(
              /([,\s])Promise\$1\s*=\s*require\$\$[^,;]+/g,
              '$1Promise$1 = Promise$1 || globalThis.Promise || Promise'
            );
            modified = modified.replace(
              /([,\s])Set\$1\s*=\s*require\$\$[^,;]+/g,
              '$1Set$1 = Set$1 || globalThis.Set || Set'
            );
            modified = modified.replace(
              /([,\s])WeakMap\$1\s*=\s*require\$\$[^,;]+/g,
              '$1WeakMap$1 = WeakMap$1 || globalThis.WeakMap || WeakMap'
            );
            modified = modified.replace(
              /([,\s])WeakSet\$1\s*=\s*require\$\$[^,;]+/g,
              '$1WeakSet$1 = WeakSet$1 || globalThis.WeakSet || WeakSet'
            );
            modified = modified.replace(
              /([,\s])Symbol\$1\s*=\s*require\$\$[^,;]+/g,
              '$1Symbol$1 = Symbol$1 || globalThis.Symbol || Symbol'
            );
            modified = modified.replace(
              /([,\s])Uint8Array\$1\s*=\s*require\$\$[^,;]+/g,
              '$1Uint8Array$1 = Uint8Array$1 || globalThis.Uint8Array || Uint8Array'
            );

            // Fix all variations of constructor assignments (with $2, $3, etc.)
            modified = modified.replace(
              /var\s+(Map|Set|WeakMap|WeakSet|DataView|Promise|Symbol|Uint8Array)\$(\d+)\s*=\s*require\$\$[^,;]+/g,
              'var $1$$2 = globalThis.$1 || $1'
            );

            // Fix root-based assignments like Uint8Array$3 = root$5.Uint8Array
            modified = modified.replace(
              /var\s+(Map|Set|WeakMap|WeakSet|DataView|Promise|Symbol|Uint8Array)\$(\d+)\s*=\s*root\$\d+\.(Map|Set|WeakMap|WeakSet|DataView|Promise|Symbol|Uint8Array);/g,
              'var $1$$2 = globalThis.$1 || $1;'
            );

            // Fix baseGetTag references - handle both require$$ and assignments with $$
            modified = modified.replace(
              /baseGetTag\$1\s*=\s*require\$\$[^,;]+/g,
              'baseGetTag$1 = baseGetTag$1 || function(value) { return value == null ? (value === undefined ? "[object Undefined]" : "[object Null]") : Object.prototype.toString.call(value); }'
            );

            // Fix isObject references - handle both require assignments and function declarations
            modified = modified.replace(
              /var\s+isObject\$1\s*=\s*require\$\$[^,;]+/g,
              'isObject$1 = isObject$1 || function(value) { var type = typeof value; return value != null && (type == "object" || type == "function"); }'
            );

            // Remove duplicate function declarations of isObject$1
            modified = modified.replace(
              /function\s+isObject\$1\s*\([^)]*\)\s*\{[^}]*\}/g,
              function (match, offset) {
                // Only remove if it's not the first occurrence (keep the polyfill)
                if (offset > 100000) {
                  // The polyfill is at the beginning
                  return '/* isObject$1 already defined */';
                }
                return match;
              }
            );

            // Fix initCloneByTag patterns
            modified = modified.replace(
              /case setTag\$(\d+):\s*return new Ctor\(\);/g,
              'case setTag$$1: return new Set$1();'
            );
            modified = modified.replace(
              /case mapTag\$(\d+):\s*return new Ctor\(\);/g,
              'case mapTag$$1: return new Map$1();'
            );

            return modified !== code ? modified : null;
          }
          return null;
        },
      },
      react({
        jsxRuntime: 'automatic', // Use automatic JSX runtime to avoid CJS/ESM issues
      }),
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
    ] as any,
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
        json5: resolve(__dirname, '../../node_modules/json5/lib/index.js'),
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
        'lodash',
        'lodash-es',
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
        define: {
          // Ensure DataView and other globals are available
          'globalThis.DataView': 'DataView',
          'globalThis.Map': 'Map',
          'globalThis.Set': 'Set',
          'globalThis.WeakMap': 'WeakMap',
          'globalThis.Promise': 'Promise',
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
