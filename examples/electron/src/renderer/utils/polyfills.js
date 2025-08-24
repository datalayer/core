/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Comprehensive polyfills for Node.js built-ins and require() in Electron renderer
 */

// Define nodeModules in global scope so it's accessible throughout
const nodeModules = (function () {
  // Node.js built-in modules polyfills
  const modules = {
    path: {
      join: function (...parts) {
        return parts
          .filter(part => part && part !== '.')
          .join('/')
          .replace(/\/+/g, '/');
      },
      dirname: function (path) {
        const lastSlash = path.lastIndexOf('/');
        return lastSlash === -1 ? '.' : path.substring(0, lastSlash) || '/';
      },
      basename: function (path, ext) {
        const name = path.substring(path.lastIndexOf('/') + 1);
        return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
      },
      extname: function (path) {
        const dotIndex = path.lastIndexOf('.');
        const slashIndex = path.lastIndexOf('/');
        return dotIndex > slashIndex ? path.substring(dotIndex) : '';
      },
      resolve: function (...paths) {
        return this.join('/', ...paths);
      },
      relative: function (from, to) {
        return to; // Simple implementation
      },
      sep: '/',
      delimiter: ':',
      parse: function (path) {
        const ext = this.extname(path);
        const base = this.basename(path);
        const name = this.basename(path, ext);
        const dir = this.dirname(path);
        return { root: '', dir, base, ext, name };
      },
    },
    os: {
      platform: function () {
        return navigator.platform.toLowerCase();
      },
      arch: function () {
        return navigator.userAgent.includes('Win') ? 'x64' : 'arm64';
      },
      release: function () {
        return '1.0.0';
      },
      type: function () {
        return navigator.platform.includes('Mac') ? 'Darwin' : 'Linux';
      },
      tmpdir: function () {
        return '/tmp';
      },
      homedir: function () {
        return '/home';
      },
      hostname: function () {
        return 'localhost';
      },
      endianness: function () {
        return 'LE';
      },
    },
    util: {
      inspect: function (obj, options) {
        return typeof obj === 'object'
          ? JSON.stringify(obj, null, 2)
          : String(obj);
      },
      promisify: function (fn) {
        return fn;
      },
      format: function (f, ...args) {
        return f.replace(/%s/g, () => args.shift() || '');
      },
      isArray: Array.isArray,
      isObject: function (obj) {
        return obj !== null && typeof obj === 'object';
      },
    },
    events: (function () {
      function EventEmitter() {
        this._events = {};
      }
      EventEmitter.prototype.on = function (event, listener) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(listener);
        return this;
      };
      EventEmitter.prototype.emit = function (event, ...args) {
        if (this._events[event]) {
          this._events[event].forEach(listener => listener.apply(this, args));
        }
        return this;
      };
      EventEmitter.prototype.removeListener = function (event, listener) {
        if (this._events[event]) {
          this._events[event] = this._events[event].filter(l => l !== listener);
        }
        return this;
      };
      return EventEmitter;
    })(),
    crypto: {
      randomBytes: function (size) {
        const arr = new Uint8Array(size);
        if (typeof window !== 'undefined' && window.crypto) {
          window.crypto.getRandomValues(arr);
        }
        return arr;
      },
      createHash: function () {
        return {
          update: function () {
            return this;
          },
          digest: function () {
            return 'mock-hash';
          },
        };
      },
    },
    buffer: {
      Buffer:
        typeof Buffer !== 'undefined'
          ? Buffer
          : {
              from: function (str) {
                return new TextEncoder().encode(str);
              },
              alloc: function (size) {
                return new Uint8Array(size);
              },
              isBuffer: function () {
                return false;
              },
            },
    },
    stream: {
      Readable: function () {},
      Writable: function () {},
      Transform: function () {},
      PassThrough: function () {},
    },
    fs: {
      readFile: function () {
        throw new Error('fs not available in browser');
      },
      writeFile: function () {
        throw new Error('fs not available in browser');
      },
      existsSync: function () {
        return false;
      },
      readFileSync: function () {
        throw new Error('fs not available in browser');
      },
    },
  };

  // Set up global polyfills for Node.js built-ins
  if (typeof globalThis !== 'undefined') {
    // Store polyfills for virtual module access
    globalThis.__nodePolyfills = modules;

    // Also set individual globals for direct access
    Object.keys(modules).forEach(name => {
      if (!globalThis[name]) {
        globalThis[name] = modules[name];
      }
    });
  }

  // Enhanced require polyfill
  if (typeof require === 'undefined') {
    window.require = function (id) {
      // Handle Node.js built-ins
      if (modules[id]) {
        return modules[id];
      }

      // Handle relative and absolute paths
      if (id.startsWith('./') || id.startsWith('../') || id.startsWith('/')) {
        console.warn(
          'require() called for local module:',
          id,
          '- not supported in browser'
        );
        throw new Error('Local module imports not supported: ' + id);
      }

      // For unknown modules, provide a helpful error
      console.warn('require() called for unknown module:', id);
      throw new Error(
        'Module not found: ' +
          id +
          ' (Node.js modules not available in renderer process)'
      );
    };

    // Also set it globally
    globalThis.require = window.require;
    console.log('Enhanced require polyfill injected with Node.js built-ins');
  }

  // Return the modules object to make it available as nodeModules
  return modules;
})();

console.log('Node.js polyfills loaded successfully');

// Make nodeModules available globally for the bundler
window.nodeModules = nodeModules;

// Export individual modules for ES module imports
// These will be used when files do `import path from 'path'` etc.
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS export
  module.exports = nodeModules;
} else if (typeof window !== 'undefined') {
  // Browser environment - create individual module exports
  window.__nodeModuleExports = nodeModules;
}
