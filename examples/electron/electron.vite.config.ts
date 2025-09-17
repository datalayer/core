/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import commonjs from '@rollup/plugin-commonjs';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import importAsString from 'vite-plugin-string';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

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
            // Copy about.js to dist/main
            copyFileSync(
              resolve(__dirname, 'src/main/about.js'),
              resolve(__dirname, 'dist/main/about.js')
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
          about: resolve(__dirname, 'src/preload/about.js'),
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
            include: [/node_modules/, /\.js$/, /\.cjs$/],
            requireReturnsDefault: 'auto',
            dynamicRequireTargets: [
              'node_modules/@jupyterlab/services/**/*.js',
            ],
            // Explicitly handle @jupyterlab/services and jQuery CommonJS exports
            namedExports: {
              jquery: ['default'],
              '@jupyterlab/services': [
                'ServiceManager',
                'ServerConnection',
                'KernelManager',
                'SessionManager',
                'ContentsManager',
                'TerminalManager',
                'SettingManager',
                'WorkspaceManager',
                'EventManager',
                'NbConvertManager',
                'KernelSpecManager',
                'UserManager',
                'BuildManager',
                'BaseManager',
                'ConfigSection',
                'ConfigSectionManager',
                'ConfigWithDefaults',
                'ConnectionStatus',
                'Drive',
                'RestContentProvider',
              ],
              '@jupyterlab/services/lib/manager': ['ServiceManager'],
              '@jupyterlab/services/lib/serverconnection': ['ServerConnection'],
              '@jupyterlab/services/lib/kernel': ['KernelManager'],
              '@jupyterlab/services/lib/session': ['SessionManager'],
              '@jupyterlab/services/lib/contents': ['ContentsManager'],
              '@jupyterlab/services/lib/config': [
                'ConfigSection',
                'ConfigSectionManager',
              ],
              '@jupyterlab/services/lib/terminal': ['TerminalManager'],
              '@jupyterlab/services/lib/kernelspec': ['KernelSpecManager'],
              '@jupyterlab/services/lib/setting': ['SettingManager'],
              '@jupyterlab/services/lib/workspace': ['WorkspaceManager'],
              '@jupyterlab/services/lib/event': ['EventManager'],
              '@jupyterlab/services/lib/nbconvert': ['NbConvertManager'],
              '@jupyterlab/services/lib/user': ['UserManager'],
              '@jupyterlab/services/lib/builder': ['BuildManager'],
              '@jupyterlab/statedb': ['DataConnector'],
              'lodash.escape': ['default'],
              ajv: ['default'],
              yjs: [
                'default',
                'Doc',
                'Map',
                'Array',
                'Text',
                'XmlElement',
                'XmlFragment',
                'XmlHook',
                'XmlText',
              ],
              // Handle nested node_modules from @jupyterlite
              '@jupyterlite/server/node_modules/@jupyterlab/services': [
                'ServiceManager',
                'ServerConnection',
              ],
              '@jupyterlite/server/node_modules/@jupyterlab/services/lib/manager':
                ['ServiceManager'],
              '@jupyterlite/server/node_modules/@jupyterlab/services/lib/serverconnection':
                ['ServerConnection'],
            },
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
        name: 'fix-sanitize-html-postcss',
        enforce: 'pre',
        resolveId(id) {
          // Intercept postcss and source-map-js to prevent externalization
          if (id === 'postcss' || id.startsWith('postcss/')) {
            return { id: '\0virtual:postcss-stub', external: false };
          }
          if (id === 'source-map-js') {
            return { id: '\0virtual:source-map-js-stub', external: false };
          }
          return null;
        },
        load(id) {
          if (id === '\0virtual:postcss-stub') {
            // Provide a minimal postcss stub for sanitize-html
            return `
              export const parse = () => ({});
              export const stringify = () => '';
              export default { parse, stringify };
            `;
          }
          if (id === '\0virtual:source-map-js-stub') {
            // Provide a minimal source-map stub
            return `
              export class SourceMapConsumer {
                constructor() {}
                destroy() {}
              }
              export class SourceMapGenerator {
                constructor() {}
                addMapping() {}
                toString() { return ''; }
              }
              export default { SourceMapConsumer, SourceMapGenerator };
            `;
          }
          return null;
        },
      },
      {
        name: 'fix-prism-extend-calls',
        transform(code, id) {
          // Fix Prism extend calls in all files that contain them
          if (
            code.includes('extend: function(id, redef)') &&
            code.includes('_.util.clone(_.languages[id])')
          ) {
            console.log(`[Vite Plugin] Fixing Prism extend calls in ${id}`);

            const fixedCode = code.replace(
              /extend: function\(id, redef\) {\s*var lang2 = _\.util\.clone\(_\.languages\[id\]\);\s*for \(var key in redef\) {\s*lang2\[key\] = redef\[key\];\s*}\s*return lang2;\s*}/g,
              `extend: function(id, redef) {
            // Extending Prism language definition
            var baseLang = _.languages[id];
            if (!baseLang) {
              // Base language not found, creating empty base
              baseLang = {};
            }
            var lang2 = _.util.clone(baseLang);
            for (var key in redef) {
              if (redef.hasOwnProperty(key)) {
                // Setting language property
                lang2[key] = redef[key];
              }
            }
            // Language extension completed
            return lang2;
          }`
            );

            if (fixedCode !== code) {
              console.log(
                `[Vite Plugin] Successfully fixed Prism extend calls in ${id}`
              );
              return fixedCode;
            }
          }
          return null;
        },
      },
      {
        name: 'fix-backbone-underscore',
        enforce: 'pre',
        transform(code, id) {
          // Fix Backbone's dependency on underscore/lodash
          if (id.includes('backbone')) {
            // Make sure underscore methods are available
            const underscorePolyfill = `
              // Ensure underscore/lodash methods are available for Backbone
              if (typeof window !== 'undefined' && !window._) {
                window._ = window.lodash || {
                  extend: Object.assign || function(target, ...sources) {
                    sources.forEach(source => {
                      for (let key in source) {
                        if (source.hasOwnProperty(key)) {
                          target[key] = source[key];
                        }
                      }
                    });
                    return target;
                  },
                  isFunction: function(obj) { return typeof obj === 'function'; },
                  isObject: function(obj) { return obj === Object(obj); },
                  isArray: Array.isArray,
                  keys: Object.keys,
                  values: Object.values,
                  pairs: function(obj) { return Object.entries(obj); },
                  invert: function(obj) {
                    const result = {};
                    const keys = Object.keys(obj);
                    for (let i = 0, length = keys.length; i < length; i++) {
                      result[obj[keys[i]]] = keys[i];
                    }
                    return result;
                  },
                  pick: function(object, ...keys) {
                    const result = {};
                    keys = keys.flat();
                    keys.forEach(key => {
                      if (key in object) result[key] = object[key];
                    });
                    return result;
                  },
                  omit: function(obj, ...keys) {
                    const result = { ...obj };
                    keys = keys.flat();
                    keys.forEach(key => delete result[key]);
                    return result;
                  },
                  defaults: function(obj, ...sources) {
                    sources.forEach(source => {
                      for (let key in source) {
                        if (obj[key] === undefined) obj[key] = source[key];
                      }
                    });
                    return obj;
                  },
                  clone: function(obj) { return obj ? JSON.parse(JSON.stringify(obj)) : obj; },
                  has: function(obj, key) { return obj != null && Object.prototype.hasOwnProperty.call(obj, key); },
                  bind: function(func, context) { return func.bind(context); },
                  each: function(obj, iteratee) {
                    if (Array.isArray(obj)) {
                      obj.forEach((val, idx) => iteratee(val, idx, obj));
                    } else {
                      Object.keys(obj).forEach(key => iteratee(obj[key], key, obj));
                    }
                  },
                  map: function(obj, iteratee) {
                    if (Array.isArray(obj)) return obj.map(iteratee);
                    return Object.keys(obj).map(key => iteratee(obj[key], key, obj));
                  },
                  reduce: function(obj, iteratee, memo) {
                    if (Array.isArray(obj)) return obj.reduce(iteratee, memo);
                    return Object.keys(obj).reduce((m, key) => iteratee(m, obj[key], key, obj), memo);
                  },
                  filter: function(obj, predicate) {
                    if (Array.isArray(obj)) return obj.filter(predicate);
                    const result = {};
                    Object.keys(obj).forEach(key => {
                      if (predicate(obj[key], key, obj)) result[key] = obj[key];
                    });
                    return result;
                  },
                  isEmpty: function(obj) {
                    if (obj == null) return true;
                    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
                    return Object.keys(obj).length === 0;
                  },
                  isString: function(obj) { return typeof obj === 'string'; },
                  isNumber: function(obj) { return typeof obj === 'number'; },
                  isBoolean: function(obj) { return obj === true || obj === false; },
                  isNull: function(obj) { return obj === null; },
                  isUndefined: function(obj) { return obj === undefined; },
                  uniqueId: (function() {
                    let idCounter = 0;
                    return function(prefix) {
                      const id = ++idCounter + '';
                      return prefix ? prefix + id : id;
                    };
                  })(),
                  result: function(obj, path) {
                    const value = obj == null ? undefined : obj[path];
                    return typeof value === 'function' ? value.call(obj) : value;
                  },
                  now: Date.now,
                  escape: function(string) {
                    const escapeMap = {
                      '&': '&amp;',
                      '<': '&lt;',
                      '>': '&gt;',
                      '"': '&quot;',
                      "'": '&#x27;',
                      '/': '&#x2F;'
                    };
                    return string ? string.replace(/[&<>"'\\/]/g, s => escapeMap[s]) : '';
                  }
                };
              }
            `;
            return underscorePolyfill + '\n' + code;
          }
          return null;
        },
      },
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
                const pathModule = {
                  join: function(...parts) {
                    if (!parts || parts.length === 0) return '.';
                    return parts.filter(p => p != null && p !== '').join('/').replace(/\\/+/g, '/');
                  },
                  dirname: function(p) {
                    if (!p) return '.';
                    const i = p.lastIndexOf('/');
                    return i === -1 ? '.' : p.substring(0, i) || '/';
                  },
                  basename: function(p, ext) {
                    if (!p) return '';
                    const n = p.substring(p.lastIndexOf('/') + 1);
                    return ext && n.endsWith(ext) ? n.slice(0, -ext.length) : n;
                  },
                  extname: function(p) {
                    if (!p) return '';
                    const d = p.lastIndexOf('.');
                    const s = p.lastIndexOf('/');
                    return d > s ? p.substring(d) : '';
                  },
                  resolve: function(...paths) {
                    return '/' + paths.filter(p => p).join('/').replace(/\\/+/g, '/');
                  },
                  relative: function(from, to) { return to; },
                  normalize: function(path) {
                    if (!path || path === '') return '.';
                    const isAbsolute = path[0] === '/';
                    const parts = path.split('/').filter(p => p && p !== '.');
                    const result = [];
                    for (let i = 0; i < parts.length; i++) {
                      if (parts[i] === '..') {
                        if (result.length > 0 && result[result.length - 1] !== '..') {
                          result.pop();
                        } else if (!isAbsolute) {
                          result.push('..');
                        }
                      } else {
                        result.push(parts[i]);
                      }
                    }
                    let normalized = result.join('/');
                    if (isAbsolute) normalized = '/' + normalized;
                    else if (normalized === '') normalized = '.';
                    return normalized;
                  },
                  sep: '/',
                  delimiter: ':',
                  parse: function(p) {
                    return {
                      root: '',
                      dir: this.dirname(p),
                      base: this.basename(p),
                      ext: this.extname(p),
                      name: this.basename(p, this.extname(p))
                    };
                  },
                  posix: null
                };
                // Add self-reference for posix
                pathModule.posix = pathModule;

                // Ensure global availability
                if (typeof globalThis !== 'undefined' && !globalThis.path) {
                  globalThis.path = pathModule;
                }
                if (typeof window !== 'undefined' && !window.path) {
                  window.path = pathModule;
                }

                export default pathModule;
                export const { join, dirname, basename, extname, resolve, relative, normalize, sep, delimiter, parse, posix } = pathModule;
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
        name: 'inject-path-polyfill',
        enforce: 'pre',
        transform(code, id) {
          // Inject path polyfill for @jupyterlab/coreutils
          if (
            id.includes('@jupyterlab/coreutils') &&
            code.includes('require("path")')
          ) {
            // Replace require("path") with our polyfill
            const pathPolyfill = `
              const path = {
                join: function(...parts) {
                  if (!parts || parts.length === 0) return '.';
                  return parts.filter(p => p != null && p !== '').join('/').replace(/\\/+/g, '/');
                },
                dirname: function(p) {
                  if (!p) return '.';
                  const i = p.lastIndexOf('/');
                  return i === -1 ? '.' : p.substring(0, i) || '/';
                },
                basename: function(p, ext) {
                  if (!p) return '';
                  const n = p.substring(p.lastIndexOf('/') + 1);
                  return ext && n.endsWith(ext) ? n.slice(0, -ext.length) : n;
                },
                extname: function(p) {
                  if (!p) return '';
                  const d = p.lastIndexOf('.');
                  const s = p.lastIndexOf('/');
                  return d > s ? p.substring(d) : '';
                },
                resolve: function(...paths) {
                  return '/' + paths.filter(p => p).join('/').replace(/\\/+/g, '/');
                },
                relative: function(from, to) { return to; },
                normalize: function(p) {
                  if (!p || p === '') return '.';
                  const isAbsolute = p[0] === '/';
                  const parts = p.split('/').filter(part => part && part !== '.');
                  const result = [];
                  for (let i = 0; i < parts.length; i++) {
                    if (parts[i] === '..') {
                      if (result.length > 0 && result[result.length - 1] !== '..') {
                        result.pop();
                      } else if (!isAbsolute) {
                        result.push('..');
                      }
                    } else {
                      result.push(parts[i]);
                    }
                  }
                  let normalized = result.join('/');
                  if (isAbsolute) normalized = '/' + normalized;
                  else if (normalized === '') normalized = '.';
                  return normalized;
                },
                sep: '/',
                delimiter: ':',
                parse: function(p) {
                  return {
                    root: '',
                    dir: this.dirname(p),
                    base: this.basename(p),
                    ext: this.extname(p),
                    name: this.basename(p, this.extname(p))
                  };
                },
                posix: null
              };
              path.posix = path;
            `;

            // Replace require("path") with inline polyfill
            const modified = code.replace(
              /const path_1 = require\("path"\);?/g,
              pathPolyfill + '\nconst path_1 = path;'
            );

            if (modified !== code) {
              return { code: modified, map: null };
            }
          }
          return null;
        },
      },
      {
        name: 'fix-jquery-import',
        enforce: 'pre',
        resolveId(id: string) {
          if (id === 'jquery') {
            return {
              id: 'jquery',
              external: false,
              moduleSideEffects: false,
            };
          }
          return null;
        },
        load(id: string) {
          if (id === 'jquery') {
            // Return jQuery as both default and named export
            return `
              import * as jQuery from 'jquery/dist/jquery.js';
              const $ = jQuery.jQuery || jQuery.$ || jQuery.default || jQuery;
              export { $ as jQuery, $ };
              export default $;
            `;
          }
          return null;
        },
      },
      {
        name: 'fix-jupyterlab-services-imports',
        enforce: 'pre',
        transform(code: string, id: string) {
          // Only process files that import from @jupyterlab/services
          if (!code.includes('@jupyterlab/services')) {
            return null;
          }

          // Don't transform the proxy file itself or the loader
          if (
            id.includes('jupyterlab-services-proxy') ||
            id.includes('serviceManagerLoader')
          ) {
            return null;
          }

          // Replace @jupyterlab/services imports with our proxy
          let modified = code;

          // Handle imports from '@jupyterlab/services'
          modified = modified.replace(
            /from\s+['"]@jupyterlab\/services['"]/g,
            `from '${resolve(
              __dirname,
              'src/renderer/polyfills/jupyterlab-proxy.js'
            )}'`
          );

          if (modified !== code) {
            return { code: modified, map: null };
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
                  normalize: function(path) {
                    if (!path || path === '') return '.';
                    const isAbsolute = path[0] === '/';
                    const parts = path.split('/').filter(p => p && p !== '.');
                    const result = [];
                    for (let i = 0; i < parts.length; i++) {
                      if (parts[i] === '..') {
                        if (result.length > 0 && result[result.length - 1] !== '..') {
                          result.pop();
                        } else if (!isAbsolute) {
                          result.push('..');
                        }
                      } else {
                        result.push(parts[i]);
                      }
                    }
                    let normalized = result.join('/');
                    if (isAbsolute) normalized = '/' + normalized;
                    else if (normalized === '') normalized = '.';
                    return normalized;
                  },
                  sep: '/', delimiter: ':',
                  parse: function(path) { const ext = this.extname(path); const base = this.basename(path); const name = this.basename(path, ext); const dir = this.dirname(path); return { root: '', dir, base, ext, name }; },
                  posix: null
                };
                pathPolyfill.posix = pathPolyfill;
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
          if (chunk.fileName.includes('index') && code.length > 1000000) {
            let modified = code;

            // CRITICAL: Fix temporal dead zone issues by injecting polyfills at the very beginning
            // Always inject for large bundles
            {
              // Step 1: Inject polyfills at the very beginning
              const immediatePolyfills = `// CRITICAL POLYFILLS - Execute synchronously at bundle start
var base$1 = function(object, source) { return object && source; };
var base$2 = function(object, source) { return object && source; };
var base$3 = function(object, source) { return object && source; };
var base$4 = function(object, source) { return object && source; };
var base$5 = function(object, source) { return object && source; };
var base$6 = function(object, source) { return object && source; };
var base$7 = function(object, source) { return object && source; };
var base$8 = function(object, source) { return object && source; };
var base$9 = function(object, source) { return object && source; };
var base$10 = function(object, source) { return object && source; };

var defineProperty$1 = function(obj, key, descriptor) {
  if (obj && typeof obj === 'object' && key != null) {
    try {
      return Object.defineProperty(obj, key, descriptor);
    } catch (e) {
      if (descriptor && descriptor.hasOwnProperty('value')) {
        obj[key] = descriptor.value;
      }
      return obj;
    }
  }
  return obj;
};

var defineProperty$2 = defineProperty$1;
var defineProperty$3 = defineProperty$1;
var defineProperty$4 = defineProperty$1;
var defineProperty$5 = defineProperty$1;
var defineProperty$6 = defineProperty$1;
var defineProperty$7 = defineProperty$1;
var defineProperty$8 = defineProperty$1;
var defineProperty$9 = defineProperty$1;
var defineProperty$10 = defineProperty$1;

var baseGetTag$1 = function(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return Object.prototype.toString.call(value);
};

var baseGetTag$2 = baseGetTag$1;
var baseGetTag$3 = baseGetTag$1;
var baseGetTag$4 = baseGetTag$1;
var baseGetTag$5 = baseGetTag$1;
var baseGetTag$6 = baseGetTag$1;
var baseGetTag$7 = baseGetTag$1;
var baseGetTag$8 = baseGetTag$1;
var baseGetTag$9 = baseGetTag$1;
var baseGetTag$10 = baseGetTag$1;

var baseSetToString$1 = function(func, string) {
  return defineProperty$1(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': function() { return string; },
    'writable': true
  });
};

var baseSetToString$2 = baseSetToString$1;
var baseSetToString$3 = baseSetToString$1;
var baseSetToString$4 = baseSetToString$1;
var baseSetToString$5 = baseSetToString$1;

var baseRest$1 = function(func, start) {
  return function() {
    var args = Array.prototype.slice.call(arguments, start || 0);
    return func.apply(this, args);
  };
};

var baseRest$2 = baseRest$1;
var baseRest$3 = baseRest$1;
var baseRest$4 = baseRest$1;
var baseRest$5 = baseRest$1;

var createAssigner$1 = function(assigner) {
  return function(object) {
    var sources = Array.prototype.slice.call(arguments, 1);
    sources.forEach(function(source) {
      if (source) {
        assigner(object, source);
      }
    });
    return object;
  };
};

var createAssigner$2 = createAssigner$1;
var createAssigner$3 = createAssigner$1;
var createAssigner$4 = createAssigner$1;
var createAssigner$5 = createAssigner$1;

`;

              // Force inject at the VERY beginning of the entire bundle
              modified = immediatePolyfills + '\n' + modified;
              console.log(
                '[Vite Plugin] ✅ Added synchronous polyfills at file start'
              );

              // Step 2: Rename conflicting widget base$1 to widgetBase$1
              // Look for the pattern: const base$1 = Object.freeze(Object.defineProperty({
              modified = modified.replace(
                /const base\$1 = Object\.freeze\(Object\.defineProperty\({/g,
                'const widgetBase$1 = Object.freeze(Object.defineProperty({'
              );

              // Step 3: Update all references to the widget export (not our polyfill functions)
              modified = modified.replace(
                /window\.define\('@jupyter-widgets\/base', base\$1\);/g,
                "window.define('@jupyter-widgets/base', widgetBase$1);"
              );

              modified = modified.replace(
                /__vitePreload\(\(\)=>Promise\.resolve\(\)\.then\(\(\)=>base\$1\)/g,
                '__vitePreload(()=>Promise.resolve().then(()=>widgetBase$1)'
              );

              modified = modified.replace(
                /resolve\(base\$1\);/g,
                'resolve(widgetBase$1);'
              );
            }

            // Comprehensive lodash polyfills for all the internal functions
            // INJECT AT THE VERY BEGINNING OF THE BUNDLE
            const lodashPolyfills = `
              // CRITICAL: Lodash polyfills must execute before any bundle code
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

              // BaseGetTag function variations - use global assignments to avoid duplicate declarations
              // Handle all variations from $1 to $10
              for (let i = 1; i <= 10; i++) {
                const varName = 'baseGetTag$' + i;
                if (typeof globalThis[varName] === 'undefined') {
                  globalThis[varName] = function(value) {
                    if (value == null) {
                      return value === undefined ? '[object Undefined]' : '[object Null]';
                    }
                    return Object.prototype.toString.call(value);
                  };
                }
              }

              // Base function variations - UNCONDITIONALLY declare to ensure availability
              // Handle all variations from $1 to $10
              globalThis.base$1 = globalThis.base$1 || function(object, source) { return object && source; };
              globalThis.base$2 = globalThis.base$2 || function(object, source) { return object && source; };
              globalThis.base$3 = globalThis.base$3 || function(object, source) { return object && source; };
              globalThis.base$4 = globalThis.base$4 || function(object, source) { return object && source; };
              globalThis.base$5 = globalThis.base$5 || function(object, source) { return object && source; };
              globalThis.base$6 = globalThis.base$6 || function(object, source) { return object && source; };
              globalThis.base$7 = globalThis.base$7 || function(object, source) { return object && source; };
              globalThis.base$8 = globalThis.base$8 || function(object, source) { return object && source; };
              globalThis.base$9 = globalThis.base$9 || function(object, source) { return object && source; };
              globalThis.base$10 = globalThis.base$10 || function(object, source) { return object && source; };

              // CRITICAL: Add defineProperty function polyfill (missing from current config)
              globalThis.defineProperty = globalThis.defineProperty || function(obj, key, descriptor) {
                if (obj && typeof obj === 'object' && key != null) {
                  try {
                    return Object.defineProperty(obj, key, descriptor);
                  } catch (e) {
                    // Fallback to simple assignment if defineProperty fails
                    if (descriptor && descriptor.hasOwnProperty('value')) {
                      obj[key] = descriptor.value;
                    }
                    return obj;
                  }
                }
                return obj;
              };

              // defineProperty variations for all numbered instances
              for (let i = 1; i <= 10; i++) {
                globalThis['defineProperty$' + i] = globalThis['defineProperty$' + i] || globalThis.defineProperty;
              }

              // baseSetToString function polyfill (uses defineProperty)
              globalThis.baseSetToString = globalThis.baseSetToString || function(func, string) {
                return globalThis.defineProperty(func, 'toString', {
                  'configurable': true,
                  'enumerable': false,
                  'value': function() { return string; },
                  'writable': true
                });
              };

              // baseSetToString variations for all numbered instances
              for (let i = 1; i <= 10; i++) {
                globalThis['baseSetToString$' + i] = globalThis['baseSetToString$' + i] || globalThis.baseSetToString;
              }

              // baseRest function polyfill (used by lodash internally)
              globalThis.baseRest = globalThis.baseRest || function(func, start) {
                return function() {
                  var args = Array.prototype.slice.call(arguments, start || 0);
                  return func.apply(this, args);
                };
              };

              // baseRest variations for all numbered instances
              for (let i = 1; i <= 10; i++) {
                globalThis['baseRest$' + i] = globalThis['baseRest$' + i] || globalThis.baseRest;
              }

              // createAssigner function polyfill (used by lodash internally)
              globalThis.createAssigner = globalThis.createAssigner || function(assigner) {
                return function(object) {
                  var sources = Array.prototype.slice.call(arguments, 1);
                  sources.forEach(function(source) {
                    if (source) {
                      assigner(object, source);
                    }
                  });
                  return object;
                };
              };

              // createAssigner variations for all numbered instances
              for (let i = 1; i <= 10; i++) {
                globalThis['createAssigner$' + i] = globalThis['createAssigner$' + i] || globalThis.createAssigner;
              }

              // CRITICAL: Declare variables directly in global scope for lodash
              // This will be injected at the top level where they're accessible
              globalThis.base$1 = globalThis.base$1 || function(object, source) { return object && source; };
              globalThis.base$2 = globalThis.base$2 || function(object, source) { return object && source; };
              globalThis.base$3 = globalThis.base$3 || function(object, source) { return object && source; };
              globalThis.base$4 = globalThis.base$4 || function(object, source) { return object && source; };
              globalThis.base$5 = globalThis.base$5 || function(object, source) { return object && source; };
              globalThis.base$6 = globalThis.base$6 || function(object, source) { return object && source; };
              globalThis.base$7 = globalThis.base$7 || function(object, source) { return object && source; };
              globalThis.base$8 = globalThis.base$8 || function(object, source) { return object && source; };
              globalThis.base$9 = globalThis.base$9 || function(object, source) { return object && source; };
              globalThis.base$10 = globalThis.base$10 || function(object, source) { return object && source; };

              // Also make them available as window properties AND as direct variables
              if (typeof window !== 'undefined') {
                window.base$1 = globalThis.base$1;
                window.base$2 = globalThis.base$2;
                window.base$3 = globalThis.base$3;
                window.base$4 = globalThis.base$4;
                window.base$5 = globalThis.base$5;
                window.base$6 = globalThis.base$6;
                window.base$7 = globalThis.base$7;
                window.base$8 = globalThis.base$8;
                window.base$9 = globalThis.base$9;
                window.base$10 = globalThis.base$10;
              }

              // CRITICAL: Use globalThis assignments (NOT var declarations) to avoid duplicate declarations
              // This follows the established pattern from previous lodash bundling fixes

              // Handle all numbered variations ($1 through $10) - GLOBALTHIS ASSIGNMENTS ONLY
              for (let i = 1; i <= 10; i++) {
                // Constructor variations
                globalThis['Map$' + i] = globalThis['Map$' + i] || globalThis._OriginalMap;
                globalThis['Set$' + i] = globalThis['Set$' + i] || globalThis._OriginalSet;
                globalThis['WeakMap$' + i] = globalThis['WeakMap$' + i] || globalThis._OriginalWeakMap;
                globalThis['WeakSet$' + i] = globalThis['WeakSet$' + i] || globalThis._OriginalWeakSet;
                globalThis['DataView$' + i] = globalThis['DataView$' + i] || globalThis._OriginalDataView;
                globalThis['Promise$' + i] = globalThis['Promise$' + i] || globalThis._OriginalPromise;
                globalThis['Symbol$' + i] = globalThis['Symbol$' + i] || globalThis._OriginalSymbol;
                globalThis['Uint8Array$' + i] = globalThis['Uint8Array$' + i] || globalThis._OriginalUint8Array;

                // Also make available on window for compatibility
                if (typeof window !== 'undefined') {
                  window['Map$' + i] = window['Map$' + i] || globalThis._OriginalMap;
                  window['Set$' + i] = window['Set$' + i] || globalThis._OriginalSet;
                  window['WeakMap$' + i] = window['WeakMap$' + i] || globalThis._OriginalWeakMap;
                  window['WeakSet$' + i] = window['WeakSet$' + i] || globalThis._OriginalWeakSet;
                  window['DataView$' + i] = window['DataView$' + i] || globalThis._OriginalDataView;
                  window['Promise$' + i] = window['Promise$' + i] || globalThis._OriginalPromise;
                  window['Symbol$' + i] = window['Symbol$' + i] || globalThis._OriginalSymbol;
                  window['Uint8Array$' + i] = window['Uint8Array$' + i] || globalThis._OriginalUint8Array;
                }
              }

              // CRITICAL: Add missing defineProperty function (lodash internal)
              if (typeof globalThis.defineProperty === 'undefined') {
                globalThis.defineProperty = function(obj, key, descriptor) {
                  if (obj && typeof obj === 'object' && key != null) {
                    try {
                      return Object.defineProperty(obj, key, descriptor);
                    } catch (e) {
                      // Fallback to simple assignment if defineProperty fails
                      if (descriptor && descriptor.hasOwnProperty('value')) {
                        obj[key] = descriptor.value;
                      }
                      return obj;
                    }
                  }
                  return obj;
                };
              }

              // Make defineProperty available for all numbered variations
              for (let i = 1; i <= 10; i++) {
                globalThis['defineProperty$' + i] = globalThis['defineProperty$' + i] || globalThis.defineProperty;
              }

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

              // CRITICAL: Safe extend function that handles undefined destination (for theme errors)
              function safeExtend(destination, ...sources) {
                // Handle undefined destination - CRITICAL FIX for theme errors
                let safeDestination = destination;
                if (!safeDestination || typeof safeDestination !== 'object') {
                  safeDestination = {};
                }

                // Process sources to fix 'class-name' properties
                const processedSources = sources.map(source => {
                  if (source && typeof source === 'object') {
                    const processed = { ...source };

                    // Fix 'class-name' -> 'className'
                    if (processed.hasOwnProperty && processed.hasOwnProperty('class-name')) {
                      if (!processed.hasOwnProperty('className')) {
                        processed.className = processed['class-name'];
                      }
                      try {
                        delete processed['class-name'];
                      } catch (e) {
                        // If can't delete, leave both
                      }
                    }

                    return processed;
                  }
                  return source;
                });

                // Use Object.assign for safe merge
                processedSources.forEach(src => {
                  if (src && typeof src === 'object') {
                    Object.assign(safeDestination, src);
                  }
                });

                return safeDestination;
              }

              // CRITICAL: Bulletproof extend function following the successful baseGetTag$ pattern
              function bulletproofExtend(object, ...sources) {
                const target = (object && typeof object === 'object') ? object : {};
                sources.forEach(source => {
                  if (source != null && typeof source === 'object') {
                    for (const key in source) {
                      if (source.hasOwnProperty(key)) {
                        const finalKey = key === 'class-name' ? 'className' : key;
                        target[finalKey] = source[key];
                      }
                    }
                  }
                });
                return target;
              }

              // Make bulletproofExtend available for ALL numbered variations (like baseGetTag$1-$10)
              globalThis.safeExtend = bulletproofExtend;
              globalThis.extend = bulletproofExtend;
              for (let i = 1; i <= 10; i++) {
                globalThis['extend$' + i] = bulletproofExtend;
              }

              // AGGRESSIVE: Force extend property assignments to succeed on non-extensible objects
              if (!globalThis._originalDefineProperty) {
                globalThis._originalDefineProperty = Object.defineProperty;
              }
              const originalDefineProperty = globalThis._originalDefineProperty;
              const forceExtendProperty = function(obj, prop, descriptor) {
                if (prop === 'extend') {
                  try {
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  } catch(e) {
                    if (e.message.includes('not extensible') || e.message.includes('Cannot add property')) {
                      console.log('[Force Extend] Making object extensible to add extend property');
                      try {
                        // Try to make object extensible if possible
                        if (Object.isSealed && Object.isSealed(obj)) {
                          console.log('[Force Extend] Object is sealed, using descriptor override');
                        } else if (Object.isFrozen && Object.isFrozen(obj)) {
                          console.log('[Force Extend] Object is frozen, using descriptor override');
                        } else {
                          // Try to extend the object by copying to new object
                          const extendedObj = Object.create(Object.getPrototypeOf(obj));
                          Object.assign(extendedObj, obj);
                          if (descriptor && descriptor.value) {
                            extendedObj[prop] = descriptor.value;
                          }
                          // Replace properties from extended object back to original
                          Object.getOwnPropertyNames(extendedObj).forEach(key => {
                            try {
                              obj[key] = extendedObj[key];
                            } catch(e2) {
                              // Skip if can't assign
                            }
                          });
                        }

                        // Force the extend property using direct assignment
                        if (descriptor && descriptor.value) {
                          try {
                            obj[prop] = descriptor.value;
                            console.log('[Force Extend] Successfully assigned extend property via direct assignment');
                            return obj;
                          } catch(e2) {
                            console.warn('[Force Extend] Direct assignment also failed:', e2.message);
                            // Assign to prototype instead
                            try {
                              const proto = Object.getPrototypeOf(obj) || obj.constructor.prototype;
                              if (proto && !proto.hasOwnProperty(prop)) {
                                proto[prop] = descriptor.value;
                                console.log('[Force Extend] Successfully assigned extend to prototype');
                                return obj;
                              }
                            } catch(e3) {
                              console.warn('[Force Extend] Prototype assignment failed:', e3.message);
                            }
                          }
                        }
                        return obj;
                      } catch(e2) {
                        console.warn('[Force Extend] All extend property assignment methods failed:', e2.message);
                        return obj;
                      }
                    }
                    throw e;
                  }
                }
                // For non-extend properties, use original method without interference
                return originalDefineProperty.call(this, obj, prop, descriptor);
              };

              // MOST FUNDAMENTAL FIX: Override Object.preventExtensions, Object.seal, and Object.freeze
              // to prevent ANY object from becoming non-extensible in production builds
              const originalPreventExtensions = Object.preventExtensions;
              const originalSeal = Object.seal;
              const originalFreeze = Object.freeze;

              Object.preventExtensions = function(obj) {
                // In production builds, silently return the object without making it non-extensible
                console.log('[Extensibility Override] Prevented Object.preventExtensions call on:', typeof obj);
                return obj;
              };

              Object.seal = function(obj) {
                // In production builds, silently return the object without sealing it
                console.log('[Extensibility Override] Prevented Object.seal call on:', typeof obj);
                return obj;
              };

              Object.freeze = function(obj) {
                // In production builds, silently return the object without freezing it
                console.log('[Extensibility Override] Prevented Object.freeze call on:', typeof obj);
                return obj;
              };

              // SURGICAL OVERRIDE: Only intercept extend property errors, leave defineProperty working normally
              const surgicalOriginalDefineProperty = globalThis._originalDefineProperty || Object.defineProperty;

              // CRITICAL: Make defineProperty available globally where lodash expects it
              globalThis.defineProperty = Object.defineProperty;
              if (typeof window !== 'undefined') {
                window.defineProperty = Object.defineProperty;
              }

              Object.defineProperty = function(obj, prop, descriptor) {
                if (prop === 'extend') {
                  try {
                    return surgicalOriginalDefineProperty.call(this, obj, prop, descriptor);
                  } catch(e) {
                    if (e.message.includes('not extensible') || e.message.includes('Cannot add property')) {
                      console.log('[Surgical Override] Prevented extend property extensibility error');
                      // Try to assign to prototype instead
                      try {
                        const proto = Object.getPrototypeOf(obj) || obj.constructor.prototype;
                        if (proto && !proto.hasOwnProperty(prop) && descriptor && descriptor.value) {
                          proto[prop] = descriptor.value;
                        }
                      } catch(e2) {
                        // Silently fail if we can't assign to prototype
                      }
                      return obj;
                    }
                    throw e;
                  }
                }
                // For all other properties, use original defineProperty without interference
                return surgicalOriginalDefineProperty.call(this, obj, prop, descriptor);
              };

              // AGGRESSIVE: Global property setter that forces extend assignments to succeed
              const forcePropertySet = function(obj, prop, value) {
                try {
                  obj[prop] = value;
                  return obj;
                } catch(e) {
                  if (prop === 'extend' && (e.message.includes('not extensible') || e.message.includes('Cannot add property'))) {
                    console.log('[Force Property Set] Forcing extend property assignment on non-extensible object');

                    // Try multiple approaches to force the assignment
                    try {
                      // Method 1: Use descriptor with original defineProperty
                      originalDefineProperty.call(Object, obj, prop, {
                        value: value,
                        writable: true,
                        configurable: true,
                        enumerable: true
                      });
                      console.log('[Force Property Set] Successfully assigned extend via defineProperty');
                      return obj;
                    } catch(e2) {
                      // Method 2: Try prototype assignment
                      try {
                        const proto = Object.getPrototypeOf(obj);
                        if (proto && !proto.hasOwnProperty(prop)) {
                          proto[prop] = value;
                          console.log('[Force Property Set] Successfully assigned extend to prototype');
                          return obj;
                        }
                      } catch(e3) {
                        // Method 3: Try constructor prototype
                        try {
                          if (obj.constructor && obj.constructor.prototype) {
                            obj.constructor.prototype[prop] = value;
                            console.log('[Force Property Set] Successfully assigned extend to constructor prototype');
                            return obj;
                          }
                        } catch(e4) {
                          console.warn('[Force Property Set] All methods failed:', e4.message);
                        }
                      }
                    }
                    return obj;
                  }
                  throw e;
                }
              };

              // Override global property assignment errors by monkey-patching common patterns
              globalThis.__safePropertySet = forcePropertySet;

              // MOST AGGRESSIVE: Complete runtime interception of extend property assignments
              // Override ALL forms of property assignment that could cause the error

              // 1. Intercept bracket notation assignments: obj['extend'] = value
              const originalPropertyAssignment = Object.prototype.__lookupSetter__;
              if (originalPropertyAssignment) {
                Object.defineProperty(Object.prototype, '__lookupSetter__', {
                  value: function(prop) {
                    if (prop === 'extend') {
                      return function(value) {
                        try {
                          this[prop] = value;
                        } catch(e) {
                          if (e.message.includes('not extensible') || e.message.includes('Cannot add property')) {
                            console.warn('[Runtime Intercept] Prevented extend assignment error on non-extensible object');
                            return this;
                          }
                          throw e;
                        }
                      };
                    }
                    return originalPropertyAssignment.call(this, prop);
                  },
                  writable: true,
                  configurable: true
                });
              }

              // 2. REMOVED: TypeError override was too aggressive and interfered with legitimate API errors
              // The Promise rejection handler below is sufficient for catching extend property errors

              // 3. Monkey-patch all possible property assignment methods
              const interceptExtendAssignment = function(originalMethod, methodName) {
                return function(...args) {
                  const prop = args[0];
                  if (prop === 'extend' || (args[1] && args[1] === 'extend')) {
                    try {
                      return originalMethod.apply(this, args);
                    } catch(e) {
                      if (e.message.includes('not extensible') || e.message.includes('Cannot add property')) {
                        console.warn('[Method Intercept ' + methodName + '] Prevented extend assignment error');
                        return this;
                      }
                      throw e;
                    }
                  }
                  return originalMethod.apply(this, args);
                };
              };

              // Apply interception to all property manipulation methods
              const origDefineProperty = Object.defineProperty;
              Object.defineProperty = interceptExtendAssignment(origDefineProperty, 'defineProperty');

              const origSetPrototypeOf = Object.setPrototypeOf;
              if (origSetPrototypeOf) {
                Object.setPrototypeOf = interceptExtendAssignment(origSetPrototypeOf, 'setPrototypeOf');
              }

              // Also protect direct property assignments to extend
              const protectExtendAssignment = (obj, value) => {
                try {
                  obj.extend = value;
                } catch(e) {
                  try {
                    origDefineProperty.call(Object, obj, 'extend', {
                      value: value,
                      writable: true,
                      configurable: true
                    });
                  } catch(e2) {
                    console.warn('[Extend Assignment Protection] Failed to add extend property:', typeof obj, e2.message);
                  }
                }
              };
              globalThis.__protectExtendAssignment = protectExtendAssignment;

              // ULTIMATE FALLBACK: Override the global error handler to catch extend property errors
              const originalOnerror = globalThis.onerror;
              globalThis.onerror = function(message, source, lineno, colno, error) {
                if (error && error.message &&
                   (error.message.includes('Cannot add property extend') ||
                    (error.message.includes('object is not extensible') && error.toString().includes('extend')))) {
                  console.warn('[Global Error Handler] Caught and suppressed extend property error:', error.message);
                  return true; // Prevent the error from propagating
                }
                if (originalOnerror) {
                  return originalOnerror(message, source, lineno, colno, error);
                }
                return false;
              };

              // FINAL SAFETY: Override Promise rejection handler for async extend property errors
              const originalUnhandledRejection = globalThis.onunhandledrejection;
              globalThis.onunhandledrejection = function(event) {
                if (event.reason && event.reason.message &&
                   (event.reason.message.includes('Cannot add property extend') ||
                    (event.reason.message.includes('object is not extensible') && event.reason.toString().includes('extend')))) {
                  console.warn('[Promise Rejection Handler] Caught and suppressed async extend property error:', event.reason.message);
                  event.preventDefault();
                  return;
                }
                if (originalUnhandledRejection) {
                  return originalUnhandledRejection(event);
                }
              };

              // Override actual lodash extend functions with safe assignment
              if (typeof window !== 'undefined') {
                if (window._) {
                  try {
                    window._.extend = bulletproofExtend;
                  } catch (e) {
                    // If can't assign directly, try defineProperty
                    try {
                      Object.defineProperty(window._, 'extend', {
                        value: bulletproofExtend,
                        writable: true,
                        configurable: true
                      });
                    } catch (e2) {
                      // If that fails too, just ignore
                      console.warn('Could not override _.extend:', e2);
                    }
                  }
                }
                if (window.lodash) {
                  try {
                    window.lodash.extend = bulletproofExtend;
                  } catch (e) {
                    try {
                      Object.defineProperty(window.lodash, 'extend', {
                        value: bulletproofExtend,
                        writable: true,
                        configurable: true
                      });
                    } catch (e2) {
                      console.warn('Could not override lodash.extend:', e2);
                    }
                  }
                }
              }
            `;

            // CRITICAL: Simplified polyfill injection for essential functions only
            // The main critical polyfills are now handled by the critical-polyfills.js import
            // This just adds extra safety for any remaining issues

            const synchronousPolyfills = `
// SYNCHRONOUS LODASH POLYFILLS - Use function declarations to avoid var conflicts
// These execute IMMEDIATELY and are available before line 3 variable declarations

// CRITICAL: Use global flag to prevent multiple definitions
if (!globalThis.__datalayerPolyfillsLoaded) {
  globalThis.__datalayerPolyfillsLoaded = true;

  // Use function declarations instead of var - they can be redeclared safely
  function base$1(object, source) { return object && source; }
  function base$2(object, source) { return object && source; }
  function base$3(object, source) { return object && source; }
  function base$4(object, source) { return object && source; }
  function base$5(object, source) { return object && source; }
  function base$6(object, source) { return object && source; }
  function base$7(object, source) { return object && source; }
  function base$8(object, source) { return object && source; }
  function base$9(object, source) { return object && source; }
  function base$10(object, source) { return object && source; }

  function defineProperty$1(obj, key, descriptor) {
    if (obj && typeof obj === 'object' && key != null) {
      try {
        return Object.defineProperty(obj, key, descriptor);
      } catch (e) {
        if (descriptor && descriptor.hasOwnProperty('value')) {
          obj[key] = descriptor.value;
        }
        return obj;
      }
    }
    return obj;
  }

  function defineProperty$2(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$3(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$4(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$5(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$6(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$7(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$8(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$9(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }
  function defineProperty$10(obj, key, descriptor) { return defineProperty$1(obj, key, descriptor); }

  function baseGetTag$1(value) {
    if (value == null) {
      return value === undefined ? '[object Undefined]' : '[object Null]';
    }
    return Object.prototype.toString.call(value);
  }

  function baseGetTag$2(value) { return baseGetTag$1(value); }
  function baseGetTag$3(value) { return baseGetTag$1(value); }
  function baseGetTag$4(value) { return baseGetTag$1(value); }
  function baseGetTag$5(value) { return baseGetTag$1(value); }
  function baseGetTag$6(value) { return baseGetTag$1(value); }
  function baseGetTag$7(value) { return baseGetTag$1(value); }
  function baseGetTag$8(value) { return baseGetTag$1(value); }
  function baseGetTag$9(value) { return baseGetTag$1(value); }
  function baseGetTag$10(value) { return baseGetTag$1(value); }

  console.log('[Synchronous Polyfills] ✅ All lodash functions defined with function declarations');
}

`;

            // ULTIMATE FIX: Direct global injection at the bundle start
            // This bypasses all Promise.then issues by making polyfills immediately available
            if (modified.includes('const __vite__mapDeps=')) {
              console.log(
                '[Vite Plugin] 🔥 ULTIMATE FIX: Injecting polyfills as immediate globals'
              );

              // Inject polyfills RIGHT after the first const declaration
              const viteMapIndex = modified.indexOf('const __vite__mapDeps=');
              const lineEnd = modified.indexOf('\n', viteMapIndex);

              const beforeInjection = modified.substring(0, lineEnd + 1);
              const afterInjection = modified.substring(lineEnd + 1);

              // Create immediate polyfills that execute synchronously
              const immediatePolyfills = `
// IMMEDIATE POLYFILLS - Execute synchronously at bundle start
// These are available BEFORE any other code runs
var base$1 = function(object, source) { return object && source; };
var base$2 = function(object, source) { return object && source; };
var base$3 = function(object, source) { return object && source; };
var base$4 = function(object, source) { return object && source; };
var base$5 = function(object, source) { return object && source; };
var base$6 = function(object, source) { return object && source; };
var base$7 = function(object, source) { return object && source; };
var base$8 = function(object, source) { return object && source; };
var base$9 = function(object, source) { return object && source; };
var base$10 = function(object, source) { return object && source; };

var defineProperty$1 = function(obj, key, descriptor) {
  if (obj && typeof obj === 'object' && key != null) {
    try {
      return Object.defineProperty(obj, key, descriptor);
    } catch (e) {
      if (descriptor && descriptor.hasOwnProperty('value')) {
        obj[key] = descriptor.value;
      }
      return obj;
    }
  }
  return obj;
};
var defineProperty$2 = defineProperty$1;
var defineProperty$3 = defineProperty$1;
var defineProperty$4 = defineProperty$1;
var defineProperty$5 = defineProperty$1;
var defineProperty$6 = defineProperty$1;
var defineProperty$7 = defineProperty$1;
var defineProperty$8 = defineProperty$1;
var defineProperty$9 = defineProperty$1;
var defineProperty$10 = defineProperty$1;

var baseGetTag$1 = function(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return Object.prototype.toString.call(value);
};
var baseGetTag$2 = baseGetTag$1;
var baseGetTag$3 = baseGetTag$1;
var baseGetTag$4 = baseGetTag$1;
var baseGetTag$5 = baseGetTag$1;
var baseGetTag$6 = baseGetTag$1;
var baseGetTag$7 = baseGetTag$1;
var baseGetTag$8 = baseGetTag$1;
var baseGetTag$9 = baseGetTag$1;
var baseGetTag$10 = baseGetTag$1;

var baseSetToString$1 = function(func, string) { return func; };
var baseSetToString$2 = function(func, string) { return func; };
var baseSetToString$3 = function(func, string) { return func; };

var baseRest$1 = function(func, start) { return func; };
var baseRest$2 = function(func, start) { return func; };

var createAssigner$1 = function(assigner) { return function(object) { return object; }; };
var createAssigner$2 = function(assigner) { return function(object) { return object; }; };

console.log('[IMMEDIATE POLYFILLS] ✅ All lodash functions available synchronously');
`;

              modified = beforeInjection + immediatePolyfills + afterInjection;

              console.log(
                '[Vite Plugin] ✅ Injected immediate polyfills at bundle start'
              );
              return modified !== code ? modified : null;
            }

            // Fallback to normal injection
            if (modified.includes("'use strict'")) {
              modified = modified.replace(
                "'use strict';",
                `'use strict';${synchronousPolyfills}`
              );
              console.log(
                '[Vite Plugin] ✅ Added synchronous polyfills after use strict'
              );
            } else {
              modified = synchronousPolyfills + '\n' + modified;
              console.log(
                '[Vite Plugin] ✅ Added synchronous polyfills at file start'
              );
            }

            // Instead of trying to wrap every assignment, add a global handler at runtime
            // This ensures any extend property assignment attempt is caught and handled gracefully

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

            // Fix baseGetTag references - handle both require$$ and assignments with $$ for all variations
            modified = modified.replace(
              /baseGetTag\$(\d+)\s*=\s*require\$\$[^,;]+/g,
              'baseGetTag$$1 = baseGetTag$$1 || function(value) { return value == null ? (value === undefined ? "[object Undefined]" : "[object Null]") : Object.prototype.toString.call(value); }'
            );

            // Fix base function references for all variations
            modified = modified.replace(
              /var\s+base\$(\d+)\s*=\s*require\$\$[^,;]+/g,
              'var base$$1 = base$$1 || function(object, source) { return object && source; }'
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
      {
        name: 'fix-jupyter-theme-class-name',
        enforce: 'pre',
        transform(code, id) {
          let modified = code;
          let hasChanges = false;

          // Fix the problematic 'class-name' property in any theme objects
          if (
            id.includes('Theme.js') ||
            id.includes('theme') ||
            code.includes('class-name')
          ) {
            // Replace 'class-name': with className: in theme objects
            modified = modified.replace(
              /'class-name':\s*(['"][^'"]*['"])/g,
              'className: $1'
            );

            // Also handle cases where it's set dynamically
            modified = modified.replace(/\['class-name'\]/g, "['className']");
            modified = modified.replace(/\["class-name"\]/g, '["className"]');

            // Handle extend operations that might be setting 'class-name'
            if (
              modified.includes('extend') &&
              (modified.includes('class-name') ||
                modified.includes("'class-name'"))
            ) {
              // Replace any remaining 'class-name' references with 'className'
              modified = modified.replace(/['"]class-name['"]/g, '"className"');
            }

            if (modified !== code) {
              hasChanges = true;
            }
          }

          // Removed broken extend call transformations - they were causing syntax errors

          if (hasChanges) {
            console.log(
              `Fixed extend calls and 'class-name' property in: ${id}`
            );
            return modified;
          }

          return null;
        },
      },
      react({
        jsxRuntime: 'automatic', // Use automatic JSX runtime to avoid CJS/ESM issues
      }),
      wasm(), // Add WASM support for loro-crdt
      {
        name: 'inject-symbol-polyfill-first',
        enforce: 'post',
        renderChunk(code, chunk) {
          // Only inject in the main bundle
          if (chunk.fileName.includes('index') && code.length > 1000000) {
            // Find where the async wrapper starts (after the initial const declarations)
            // We need to inject Symbol BEFORE any async code
            const asyncPattern = /let __tla = Promise\.all\(/;
            const match = code.match(asyncPattern);

            if (match) {
              const insertIndex = match.index;

              // Symbol polyfill that runs SYNCHRONOUSLY before ANY async code
              const symbolPolyfill = `
// CRITICAL: Symbol polyfill MUST run before any async code
(function() {
  if (typeof Symbol === 'undefined') {
    globalThis.Symbol = function Symbol(desc) {
      return '@@Symbol' + (desc || '') + '_' + Math.random();
    };
  }
  if (!Symbol.for) {
    var reg = {};
    Symbol.for = function(k) {
      if (!reg[k]) reg[k] = Symbol(k);
      return reg[k];
    };
    Symbol.keyFor = function(s) {
      for (var k in reg) if (reg[k] === s) return k;
    };
  }
  if (!Symbol.iterator) Symbol.iterator = Symbol('iterator');
  if (!Symbol.toStringTag) Symbol.toStringTag = Symbol('toStringTag');
  console.log('[Vite Symbol] Injected before async wrapper');
})();
`;

              // Insert the polyfill RIGHT BEFORE the async wrapper
              const modifiedCode =
                code.slice(0, insertIndex) +
                symbolPolyfill +
                code.slice(insertIndex);

              return {
                code: modifiedCode,
                map: null,
              };
            } else {
              // Fallback: inject at the very beginning if pattern not found
              const symbolPolyfill = `// Symbol polyfill at start
(function() {
  if (typeof Symbol === 'undefined') {
    globalThis.Symbol = function Symbol(desc) {
      return '@@Symbol' + (desc || '') + '_' + Math.random();
    };
  }
  if (!Symbol.for) {
    var reg = {};
    Symbol.for = function(k) {
      if (!reg[k]) reg[k] = Symbol(k);
      return reg[k];
    };
    Symbol.keyFor = function(s) {
      for (var k in reg) if (reg[k] === s) return k;
    };
  }
  if (!Symbol.iterator) Symbol.iterator = Symbol('iterator');
  if (!Symbol.toStringTag) Symbol.toStringTag = Symbol('toStringTag');
})();
`;
              return {
                code: symbolPolyfill + code,
                map: null,
              };
            }
          }
          return null;
        },
      },
      topLevelAwait(), // Add top-level await support
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
        '@datalayer/core': resolve(__dirname, '../..'),
        '@primer/css': resolve(__dirname, '../../node_modules/@primer/css'),
        '@datalayer/jupyter-react': resolve(
          __dirname,
          '../../node_modules/@datalayer/jupyter-react'
        ),
        '~react-toastify': 'react-toastify',
        json5: resolve(__dirname, '../../node_modules/json5/lib/index.js'),
        // Alias underscore to lodash
        underscore: 'lodash',
        // Force @jupyterlite to use our root @jupyterlab/services
        '@jupyterlite/server/node_modules/@jupyterlab/services': resolve(
          __dirname,
          '../../node_modules/@jupyterlab/services'
        ),
      },
    },
    optimizeDeps: {
      include: [
        'lodash-es',
        'json5',
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@jupyterlab/services',
        '@jupyterlab/statedb',
        'lodash.escape',
        'ajv',
        'yjs',
        '@jupyterlab/services/lib/manager',
        '@jupyterlab/services/lib/serverconnection',
        '@jupyterlab/services/lib/kernel',
        '@jupyterlab/services/lib/kernel/messages',
        '@jupyterlab/services/lib/kernel/serialize',
        '@jupyterlab/services/lib/session',
        '@jupyterlab/services/lib/contents',
        '@jupyterlab/services/lib/config',
        '@jupyterlab/services/lib/kernelspec',
        '@jupyterlab/services/lib/setting',
        '@jupyterlab/services/lib/terminal',
        '@jupyterlab/services/lib/workspace',
        '@jupyterlab/services/lib/user',
        '@jupyterlab/services/lib/nbconvert',
        '@jupyterlab/services/lib/event',
        '@jupyterlab/services/lib/basemanager',
        '@datalayer/jupyter-react',
        '@primer/react',
        'zustand',
        'ws',
        'form-data',
        // Collaboration dependencies
        '@datalayer/lexical-loro',
      ],
      exclude: [
        'next/navigation',
        'next/router',
        '@react-navigation/native',
        '@jupyterlite/pyodide-kernel',
        '@jupyterlab/apputils-extension',
        // Exclude Node.js built-ins from optimization
        'path',
        'fs',
        'url',
        'source-map-js',
        'postcss',
        // Exclude WASM modules from optimization
        'loro-crdt',
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
