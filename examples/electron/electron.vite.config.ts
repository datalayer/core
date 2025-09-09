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
            let modified = code.replace(
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
              'src/renderer/utils/jupyterlab-services-proxy.js'
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

              // Base function variations - use global assignments to avoid duplicate declarations
              // Handle all variations from $1 to $10
              for (let i = 1; i <= 10; i++) {
                const varName = 'base$' + i;
                if (typeof globalThis[varName] === 'undefined') {
                  globalThis[varName] = function(object, source) { return object && source; };
                }
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
        'lodash',
        'lodash-es',
        'underscore',
        'backbone',
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
