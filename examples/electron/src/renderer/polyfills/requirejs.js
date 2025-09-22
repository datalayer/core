/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * RequireJS shim for Jupyter widgets in Electron
 *
 * This provides a minimal RequireJS implementation that allows Jupyter widgets
 * to load their view classes dynamically in the Electron/Vite environment.
 */

// Store loaded modules
const moduleRegistry = new Map();

// Define a minimal RequireJS-compatible loader
window.requirejs = function (deps, callback) {
  console.log('RequireJS shim: Loading', deps);

  if (typeof deps === 'string') {
    // Single module request
    return moduleRegistry.get(deps);
  }

  // Multiple dependencies
  if (Array.isArray(deps) && callback) {
    const modules = deps.map(dep => moduleRegistry.get(dep) || {});
    callback(...modules);
  }
};

// Alias for compatibility
window.require = window.requirejs;

// RequireJS configuration
window.requirejs.config = function (config) {
  console.log('RequireJS shim: Config', config);
  // Store config but don't process it - we handle modules directly
};

// Define function for registering modules
window.define = function (name, deps, factory) {
  // Handle different calling patterns
  if (typeof name !== 'string') {
    // Anonymous module
    factory = deps;
    deps = name;
    name = null;
  }

  if (!Array.isArray(deps)) {
    factory = deps;
    deps = [];
  }

  // Execute factory function
  if (typeof factory === 'function') {
    const depModules = deps.map(dep => {
      if (dep === 'exports') return {};
      if (dep === 'require') return window.requirejs;
      // Special handling for underscore/lodash
      if (dep === 'underscore' || dep === 'lodash') {
        return window._ || window.lodash || moduleRegistry.get(dep) || {};
      }
      return moduleRegistry.get(dep) || {};
    });

    const exports = {};
    const result = factory(...depModules);
    const module = result || exports;

    // Register the module if it has a name
    if (name) {
      moduleRegistry.set(name, module);
    }

    return module;
  }

  // Direct value
  if (name && factory !== undefined) {
    moduleRegistry.set(name, factory);
  }
};

// AMD flag
window.define.amd = {
  jQuery: true,
};

// Pre-register underscore/lodash if available
if (window._ || window.lodash) {
  const lodashModule = window._ || window.lodash;
  moduleRegistry.set('underscore', lodashModule);
  moduleRegistry.set('lodash', lodashModule);
  console.log('RequireJS shim: Pre-registered underscore/lodash');
}

// Pre-register Backbone if available
if (window.Backbone) {
  moduleRegistry.set('backbone', window.Backbone);
  console.log('RequireJS shim: Pre-registered Backbone');
}

// Pre-register Jupyter widget modules that are already loaded
async function registerJupyterModules() {
  try {
    // Import widget modules
    const [base, controls, output] = await Promise.all([
      import('@jupyter-widgets/base'),
      import('@jupyter-widgets/controls'),
      import('@jupyter-widgets/output'),
    ]);

    // Register modules in RequireJS format
    moduleRegistry.set('@jupyter-widgets/base', base);
    moduleRegistry.set('@jupyter-widgets/controls', controls);
    moduleRegistry.set('@jupyter-widgets/output', output);

    // Also register with version numbers (common pattern)
    moduleRegistry.set('@jupyter-widgets/base@*', base);
    moduleRegistry.set('@jupyter-widgets/controls@*', controls);
    moduleRegistry.set('@jupyter-widgets/output@*', output);

    // Register specific view classes
    if (base.ErrorWidgetView) {
      moduleRegistry.set('@jupyter-widgets/base/ErrorWidgetView', {
        ErrorWidgetView: base.ErrorWidgetView,
      });
    }

    console.log('RequireJS shim: Registered Jupyter widget modules');
  } catch (error) {
    console.error('RequireJS shim: Failed to register modules', error);
  }
}

// Register modules on load
registerJupyterModules();

// Export for debugging
window.__requireRegistry = moduleRegistry;

console.log('RequireJS shim loaded');
