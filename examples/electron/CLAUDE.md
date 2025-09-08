# CLAUDE.md - Electron Example

This document contains important configuration and troubleshooting information for the Datalayer Electron example application.

## Quick Start

```bash
npm install
npm start  # Runs in development mode with hot-reload (DevTools enabled)
npm run dist:mac  # Build production app for macOS (DevTools disabled)
npm run dist:dev-prod:mac  # Build dev-prod app for testing (DevTools enabled)
```

## DevTools Security Configuration (NEW!)

The Electron app now includes comprehensive DevTools security controls:

### Environment Detection & DevTools Control

```typescript
// Environment detection utilities in src/main/index.ts
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

function isDevProd(): boolean {
  return process.env.ELECTRON_DEV_PROD === 'true';
}

function shouldEnableDevTools(): boolean {
  return isDevelopment() || isDevProd();
}

// DevTools control in WebPreferences
webPreferences: {
  devTools: shouldEnableDevTools(), // Disabled in production
}
```

### Build Commands with DevTools Control

```json
{
  "dist:mac": "npm run build && electron-builder --mac --universal",
  "dist:dev-prod:mac": "cross-env ELECTRON_DEV_PROD=true npm run build && cross-env ELECTRON_DEV_PROD=true electron-builder --mac --universal"
}
```

### Security Features in Production

1. **DevTools Menu Removal**: Developer Tools menu items conditionally hidden
2. **Keyboard Shortcut Protection**: F12, Ctrl+Shift+I, etc. disabled
3. **Context Menu Protection**: Right-click context menu disabled
4. **About Dialog Security**: Secure context isolation with IPC handlers

### About Dialog Security Implementation

- **Secure Preload Script** (`src/preload/about.js`):

  ```javascript
  contextBridge.exposeInMainWorld('aboutAPI', {
    close: () => {
      ipcRenderer.send('close-about-window');
    },
    openExternal: url => {
      ipcRenderer.send('open-external', url);
    },
  });
  ```

- **Secure Renderer Script** (`src/main/about.js`):

  ```javascript
  if (window.aboutAPI) {
    window.aboutAPI.close();
  }
  ```

- **IPC Handlers** in main process for secure communication

## CJS/ESM Module Resolution Configuration

The Electron app uses a custom Vite configuration to handle the complex module ecosystem of Jupyter packages. Here's what's configured:

### Key Configuration in `electron.vite.config.ts`

1. **React Automatic JSX Runtime**

   ```typescript
   react({
     jsxRuntime: 'automatic', // Avoids CJS/ESM conflicts with React 17+
   });
   ```

2. **CommonJS Plugin for Rollup**

   ```typescript
   commonjs({
     transformMixedEsModules: true,
     include: [/node_modules/, /\.js$/],
     requireReturnsDefault: 'auto',
   });
   ```

3. **PostCSS and Source-Map-JS Stubs** (NEW)

   ```typescript
   {
     name: 'fix-sanitize-html-postcss',
     resolveId(id) {
       if (id === 'postcss' || id.startsWith('postcss/')) {
         return { id: '\0virtual:postcss-stub', external: false };
       }
       if (id === 'source-map-js') {
         return { id: '\0virtual:source-map-js-stub', external: false };
       }
     }
   }
   ```

4. **Backbone/Underscore Compatibility** (NEW)

   ```typescript
   {
     name: 'fix-backbone-underscore',
     transform(code, id) {
       if (id.includes('backbone')) {
         // Inject comprehensive underscore polyfill before Backbone code
         return underscorePolyfill + '\n' + code;
       }
     }
   }
   ```

5. **Module Aliases**

   ```typescript
   resolve: {
     alias: {
       'underscore': 'lodash', // Alias underscore to lodash
       '@jupyterlite/server/node_modules/@jupyterlab/services':
         resolve(__dirname, '../../node_modules/@jupyterlab/services'),
     }
   }
   ```

6. **Lodash Bundling Fix Plugin**

   ```typescript
   {
     name: 'fix-lodash-bundling',
     resolveId(id) {
       // Intercept problematic lodash imports
       if (id.includes('lodash') && id.includes('_baseGetTag')) {
         return '\0virtual:lodash-baseGetTag';
       }
       if (id.includes('lodash') && id.includes('_DataView')) {
         return '\0virtual:lodash-dataview';
       }
     },
     load(id) {
       // Provide virtual implementations for lodash internals
       if (id === '\0virtual:lodash-baseGetTag') {
         return `export default function baseGetTag(value) { ... }`;
       }
       if (id === '\0virtual:lodash-dataview') {
         return 'export default globalThis.DataView;';
       }
     }
   }
   ```

7. **Optimized Dependencies** (UPDATED)
   ```typescript
   optimizeDeps: {
     include: [
       'lodash',        // Load first for Backbone
       'lodash-es',
       'underscore',    // Alias to lodash
       'backbone',      // Pre-bundle for widgets
       'json5',
       'react',
       'react-dom',
       'react/jsx-runtime',
       '@jupyterlab/services',
       // ... other JupyterLab packages
     ],
     exclude: [
       'next/navigation',
       'next/router',
       '@react-navigation/native',
       '@jupyterlite/pyodide-kernel',
       '@jupyterlab/apputils-extension',
       // Node.js built-ins to prevent externalization
       'path',
       'fs',
       'url',
       'source-map-js',
       'postcss',
     ],
   }
   ```

### Console Logging Safety (Main Process)

To prevent EPIPE errors in Electron's main process:

```typescript
// Override console methods to use electron-log safely
console.log = (...args: any[]) => {
  try {
    log.info(...args);
  } catch (e: any) {
    if (e?.code !== 'EPIPE') {
      originalConsoleLog('Log error:', e);
    }
  }
};
```

## Critical Module Loading Order (NEW!)

### Underscore/Lodash and Backbone Loading

**Problem**: Backbone requires underscore/lodash to be available globally as `_` before it loads, otherwise you get:

- `_.extend is not a function`
- `_3.extend is not a function` (in minified bundles)
- `Class extends value undefined is not a constructor` (when Backbone.View is undefined)

**Solution**: Created `src/renderer/preload-underscore.js` that loads BEFORE everything else:

```javascript
// Pre-load lodash as underscore for Backbone compatibility
import * as lodash from 'lodash';
import * as Backbone from 'backbone';

// Make lodash available globally as underscore
window._ = lodash;
window.lodash = lodash;

// Also make Backbone available globally for widgets
window.Backbone = Backbone;

export { lodash, Backbone };
```

This file MUST be imported first in `main.tsx`:

```typescript
// CRITICAL: Load underscore/lodash FIRST for Backbone
import './preload-underscore';

// Then load polyfills and other modules
import './utils/lodash-polyfills';
import './utils/polyfills';
import './utils/requirejs-shim';
```

### RequireJS Shim Updates

The `requirejs-shim.js` now pre-registers underscore/lodash and Backbone:

```javascript
// Pre-register underscore/lodash if available
if (window._ || window.lodash) {
  const lodashModule = window._ || window.lodash;
  moduleRegistry.set('underscore', lodashModule);
  moduleRegistry.set('lodash', lodashModule);
}

// Pre-register Backbone if available
if (window.Backbone) {
  moduleRegistry.set('backbone', window.Backbone);
}
```

## Known Issues

### Production Build CJS/ESM Issues (RESOLVED!)

- **Problems Encountered**:

  1. `"default" is not exported by "@jupyterlab/services"` - Module export issues
  2. `ServiceManager not found in services: Module` - Vite's \_\_require wrapper in production
  3. `Cannot convert object to primitive value` - Direct object logging causing TypeErrors
  4. `path_1.posix.normalize is not a function` - Missing path polyfill functions

- **Solutions**:

  1. **Module Imports**: Changed from default import to namespace import: `import * as services`
  2. **\_\_require Wrapper Handling**: Added detection and unwrapping for Vite's production module wrapper
  3. **Safe Logging**: Use `typeof` and `Object.keys()` instead of direct object logging
  4. **Path Polyfills**: Added complete `normalize` function to all three path polyfills in Vite config

- **Key Files**:

  - `src/renderer/utils/jupyterlab-services-proxy.js` - Handles \_\_require wrapper and module exports
  - `src/renderer/services/serviceManagerLoader.ts` - Dynamically loads ServiceManager
  - `electron.vite.config.ts` - Contains path polyfills injected inline that MUST include normalize function

- **Production Build Now Works**: The app successfully builds and packages for production!

### Universal macOS Builds (RESOLVED!)

- **Problem**: Native modules (`bufferutil`, `utf-8-validate`) causing "Can't reconcile two non-macho files" error
- **Solution**:
  1. Made native modules optional dependencies
  2. Excluded build directories from packaging
  3. Disabled npm rebuild in electron-builder
- **Build Commands**:
  - `npm run dist:mac-universal` - Creates universal binary for Intel & Apple Silicon
  - Works on all Mac processors (Intel x64 and Apple Silicon M1/M2/M3)
  - Files are ~2x larger but provide single download for all users
- **APFS vs HFS+**:
  - Message about "HFS+ is unavailable" is informational only
  - APFS is the modern format, works on macOS 10.12+

### Lodash Bundling Issues (RESOLVED - MAJOR HEADACHE!)

- **Problems Encountered**:

  1. `(Map$3 || ListCache$2) is not a constructor` - Lodash internal constructors undefined
  2. `Uint8Array is not a constructor` - Native constructor overwritten
  3. `Cannot redefine property: Uint8Array` - Property protection conflicts
  4. `Cannot set property default of function which has only a getter` - Module export conflicts
  5. `Symbol$5 is not defined` - Numbered constructor variations missing

- **Root Causes**:

  - Lodash uses internal data structures (ListCache, MapCache, Stack) that aren't properly defined in production builds
  - The bundler creates numbered variations of constructors (Map$1, Map$2, etc.) that lodash expects
  - CommonJS to ESM conversion creates getter-only properties that break when reassigned
  - Native constructors get overwritten during bundling

- **Final Solution**:

  1. **Lodash Polyfills** (`src/renderer/utils/lodash-polyfills.js`):

     - Provides ListCache, MapCache, Stack, and Hash implementations
     - Makes all numbered constructor variations available (Map$1-$6, Symbol$1-$6, etc.)
     - Imported at the very beginning of `src/renderer/main.tsx`

  2. **Vite Config Fixes** (`electron.vite.config.ts`):

     - `fix-module-exports` plugin: Wraps `.default = ` assignments in try-catch
     - `fix-lodash-bundling` plugin: Injects comprehensive polyfills into bundle
     - Replaces `new Uint8Array(` with fallback pattern
     - Ensures all constructor variations are available globally

  3. **What NOT to do**:
     - Don't use constructor wrappers that interfere with module exports
     - Don't make properties non-configurable (causes conflicts)
     - Don't use aggressive property protection (breaks legitimate code)

- **Key Lessons**:
  - Clean builds are essential: `rm -rf dist dist-electron node_modules/.vite`
  - Constructor wrappers that use Proxy can break module.exports
  - Lodash needs very specific internal implementations to work when bundled
  - The numbered variations (like Symbol$5) are created by the bundler and must be polyfilled

### Development Mode Issues (RESOLVED!)

- **Problems Encountered**:

  1. `Module "path" has been externalized for browser compatibility` - Node.js modules being externalized
  2. `Module "postcss" has been externalized` - PostCSS and source-map-js externalization
  3. `_.extend is not a function` - Backbone loading before underscore
  4. `Class extends value undefined` - Backbone.View undefined when widgets load
  5. Vite dependency pre-bundling errors with missing chunks

- **Solutions**:
  1. **Node.js Module Stubs**: Added virtual stubs for postcss and source-map-js
  2. **Module Loading Order**: Created `preload-underscore.js` to ensure lodash/Backbone load first
  3. **Vite OptimizeDeps**: Added all critical packages to `include` array, in correct order
  4. **Exclude Node Built-ins**: Added path, fs, url, postcss to `exclude` array
  5. **Alias underscore**: Added `'underscore': 'lodash'` to resolve aliases

### Common Error Messages

1. **"ServerConnection is not exported"**

   - The custom resolver handles this in dev mode
   - For production, may need additional webpack/rollup configuration

2. **"KernelMessage is not exported"**

   - These are namespace exports from @jupyterlab/services
   - Dev server resolves these dynamically

3. **EPIPE Errors**

   - Fixed by wrapping console methods in try-catch blocks
   - Only affects the main process, not renderer

4. **"baseGetTag is not defined"** (RESOLVED)
   - Fixed by custom lodash bundling plugin
   - Provides proper implementations for lodash internals

## Development Commands

```bash
# Development
npm start              # Start in dev mode (recommended)
npm run dev           # Same as npm start

# Code Quality
npm run check         # Run all checks
npm run check:fix     # Auto-fix issues
npm run format        # Format with Prettier
npm run lint:fix      # Fix ESLint issues
npm run type-check    # TypeScript checking

# Building
npm run build         # Build for production
npm run dist:mac-universal  # Universal binary for all Mac processors (recommended)
npm run dist:mac-intel     # Intel-only Mac build
npm run dist:mac-arm       # Apple Silicon only (M1/M2/M3)
npm run dist:win      # Package for Windows
npm run dist:linux    # Package for Linux
```

## Architecture Notes

### Process Separation

- **Main Process**: Electron main, handles window management and IPC
- **Renderer Process**: React app with Jupyter integration
- **Preload Script**: Secure bridge between main and renderer

### Security Configuration

- Context isolation enabled
- No direct Node.js integration in renderer
- CSP headers configured for production
- Secure IPC communication via preload script
- **IMPORTANT**: External API calls (GitHub, etc.) must go through main process to avoid CSP violations

### API Integration

- Proxies `/api` requests to `https://prod1.datalayer.run`
- Uses Bearer token authentication
- WebSocket proxy for kernel communication
- Collaboration uses notebook UIDs (not paths)
- **User Authentication**: Fetches user info from `/api/iam/v1/whoami`
- **GitHub Integration**: User's GitHub ID extracted from `origin_s` field (format: `urn:dla:iam:ext::github:226720`)
- **External APIs**: All external API calls (GitHub, etc.) routed through main process using Electron's `net` module to bypass CSP

## Troubleshooting Tips

1. **Clear and Rebuild**

   ```bash
   rm -rf dist dist-electron node_modules
   npm install
   npm start
   ```

2. **Check Node Version**

   - Requires Node 18+
   - Use `node --version` to verify

3. **Electron Rebuild**

   ```bash
   npx electron-rebuild
   ```

4. **Debug Module Issues**

   - Check browser DevTools console
   - Look for module resolution errors
   - Use `npm run dev` instead of `npm run build`

5. **CSP Violations in Production**

   - "Refused to connect" errors mean API calls need to go through main process
   - Add new API methods to `api-service.ts` using Electron's `net` module
   - Register IPC handlers in `main/index.ts`
   - Expose methods in `preload/index.ts`

6. **User Profile Not Updating**
   - Check that `/api/iam/v1/whoami` is returning user data
   - Verify `origin_s` field contains GitHub ID in format `urn:dla:iam:ext::github:XXXXX`
   - Ensure GitHub API calls go through IPC bridge, not direct fetch

## Important Files

- `electron.vite.config.ts` - Vite configuration with CJS/ESM fixes and lodash bundling solutions
- `src/main/index.ts` - Main process with console safety wrappers and IPC handlers
- `src/main/services/api-service.ts` - API service with secure external API calls (GitHub, IAM)
- `src/preload/index.ts` - Preload script exposing datalayerAPI, electronAPI, and proxyAPI
- `src/renderer/main.tsx` - Entry point with critical polyfill imports
- `src/renderer/utils/polyfills.js` - Node.js built-in modules polyfills
- `src/renderer/utils/lodash-polyfills.js` - Lodash internal data structure implementations
- `src/renderer/utils/jupyterlab-services-proxy.js` - JupyterLab services module loader
- `src/renderer/utils/logger.ts` - Logging utilities
- `src/renderer/services/proxyServiceManager.ts` - WebSocket proxy for kernels
- `src/renderer/services/serviceManagerLoader.ts` - Dynamic ServiceManager loader
- `src/renderer/components/NotebookView.tsx` - Jupyter notebook integration with runtime termination dialog
- `src/renderer/components/LoginView.tsx` - Authentication UI with user data callback
- `src/renderer/App.tsx` - Main app with dynamic GitHub user profile fetching

## Dependencies to Note

- `@rollup/plugin-commonjs` - Critical for CJS/ESM handling
- `electron-vite` - Build tool for Electron + Vite
- `vite-plugin-string` - Handles raw CSS imports
- `@datalayer/jupyter-react` - Jupyter components
- `@jupyterlab/services` - Kernel and session management

## Polyfill Files Overview

The `src/renderer/utils/` folder contains only the **essential** polyfill files needed for the app to work:

1. **`polyfills.js`** - Node.js built-in modules polyfills (path, os, util, events, crypto, buffer, stream, fs)
2. **`lodash-polyfills.js`** - Lodash internal data structures (ListCache, MapCache, Stack, Hash)
3. **`jupyterlab-services-proxy.js`** - JupyterLab services module loader with Vite production wrapper handling
4. **`logger.ts`** - Logging utilities for debugging

**Note**: Several legacy polyfill files were removed as they were unused:

- `jupyterlab-services-cjs-bridge.cjs` - Replaced by jupyterlab-services-proxy.js
- `jupyterlab-services-interop.cjs` - Replaced by jupyterlab-services-proxy.js
- `jupyterlab-services-loader.js` - Replaced by jupyterlab-services-proxy.js
- `path-polyfill.js` - Path polyfills are now injected inline by Vite config

## WebSocket Connection Cleanup System

### Runtime Termination and WebSocket Prevention (NEW!)

The app implements a comprehensive WebSocket cleanup system to prevent connection errors after runtime termination:

#### 1. **Global Cleanup Registry**

Both renderer and main processes maintain a global cleanup registry:

```typescript
// Renderer process (window scope)
(window as any).__datalayerRuntimeCleanup = new Map();

// Main process (global scope)
(global as any).__datalayerRuntimeCleanup = new Map();
```

The registry tracks terminated runtimes with structure: `Map<string, { terminated: boolean }>`

#### 2. **WebSocket Connection Prevention**

**WebSocket Proxy Blocking** (`src/main/services/websocket-proxy.ts:35-42`):

```typescript
// Check if this runtime has been terminated
if (runtimeId) {
  const cleanupRegistry = (global as any).__datalayerRuntimeCleanup;
  if (
    cleanupRegistry &&
    cleanupRegistry.has(runtimeId) &&
    cleanupRegistry.get(runtimeId).terminated
  ) {
    log.debug(
      `[WebSocket Proxy] 🛑 BLOCKED: Preventing new connection to terminated runtime ${runtimeId}`
    );
    throw new Error(
      `Runtime ${runtimeId} has been terminated - no new connections allowed`
    );
  }
}
```

#### 3. **IPC Communication Bridge**

**Main Process Handler** (`src/main/index.ts:635-647`):

```typescript
ipcMain.handle('runtime-terminated', async (_, { runtimeId }) => {
  // Initialize global cleanup registry in main process
  if (!(global as any).__datalayerRuntimeCleanup) {
    (global as any).__datalayerRuntimeCleanup = new Map();
  }

  const cleanupRegistry = (global as any).__datalayerRuntimeCleanup;
  cleanupRegistry.set(runtimeId, { terminated: true });

  log.debug(
    `[Runtime Cleanup] 🛑 Main process marked runtime ${runtimeId} as terminated`
  );

  return { success: true };
});
```

**Preload Method** (`src/preload/index.ts:36-37`):

```typescript
// Runtime termination notification
notifyRuntimeTerminated: (runtimeId: string) =>
  ipcRenderer.invoke('runtime-terminated', { runtimeId }),
```

#### 4. **Runtime Store Integration**

**Termination Notification** (`src/renderer/stores/runtimeStore.ts:317-322`):

```typescript
// Mark this runtime as terminated to prevent new timers
cleanupRegistry.set(runtimeId, { terminated: true });

console.info('🛑 [Targeted Cleanup] Marked runtime as terminated:', runtimeId);

// Notify main process to update its cleanup registry for WebSocket blocking
try {
  (window as any).electronAPI?.notifyRuntimeTerminated?.(runtimeId);
} catch (error) {
  console.warn('🛑 [Targeted Cleanup] Error notifying main process:', error);
}
```

#### 5. **Multi-Layer Protection**

The system provides multiple layers of protection:

1. **HTTP Request Blocking**: `proxyFetch()` blocks API requests to terminated runtimes
2. **Collaboration Provider Prevention**: Checks termination flag before creating providers
3. **WebSocket Proxy Blocking**: Prevents new WebSocket connections at the source
4. **Service Manager Cleanup**: Aggressively disposes kernel/session managers

#### 6. **Known Limitations**

- Some "Connection ws-X not found" errors may still occur for connections created before termination
- The system prevents NEW connections but doesn't immediately close existing ones
- WebSocket cleanup is async, so there may be a brief window where connections exist

## For AI Assistants

When working with this codebase:

1. Always use `npm start` for development, not `npm run build`
2. The dev server handles module resolution better than production builds
3. Don't try to fix all ESLint warnings at once - many are intentional console.logs for debugging
4. The EPIPE error fix in main/index.ts is critical - don't remove it
5. The custom Vite plugins are necessary for JupyterLab imports - don't simplify them
6. **CRITICAL**: The lodash polyfills and Vite config fixes are ESSENTIAL for production builds
7. If you see constructor errors, check `lodash-polyfills.js` first
8. Clean the build cache if you see persistent errors: `rm -rf dist dist-electron node_modules/.vite`
9. The numbered constructor variations (Map$1, Symbol$5, etc.) are NOT a mistake - lodash needs them
10. Never use Proxy wrappers on constructors in production - they break module.exports
11. **Production Build Module Resolution**: Vite wraps CommonJS modules with `__require` function in production
12. **Path Polyfills**: The `path.posix.normalize` function MUST be included in inline path polyfills in Vite config
13. **Object Logging**: Avoid direct object logging in production - use `typeof` and `Object.keys()` instead
14. **Async IIFE for Dynamic Imports**: When using `await import()` outside async functions, wrap in async IIFE
15. **Universal Builds**: Use `npm run dist:mac-universal` for macOS universal binaries
16. **Native Modules**: `bufferutil` and `utf-8-validate` are optional dependencies to avoid universal build issues
17. **Polyfills Directory**: Only 4 polyfill files remain in utils/ - all are actively used and essential
18. **CSP Violations**: External API calls (GitHub, etc.) MUST go through main process using IPC bridge
19. **User Authentication**: User data fetched from `/api/iam/v1/whoami`, GitHub ID extracted from `origin_s` field
20. **GitHub ID Format**: Parse `origin_s` field by splitting on `:` and taking last element (e.g., `"urn:dla:iam:ext::github:226720"` → `226720`)
21. **API Response Structure**: IAM whoami endpoint returns data nested in `profile` object, not flat
22. **DevTools Security**: Production builds have DevTools disabled, use `dist:dev-prod:mac` for testing with DevTools enabled
23. **About Dialog Security**: Uses secure context isolation with preload scripts and IPC handlers
24. **Environment Variables**: Use `ELECTRON_DEV_PROD=true` to enable DevTools in production builds for testing
25. **Security Best Practices**: Keyboard shortcuts and right-click context menu disabled in production for security
26. **WebSocket Cleanup System**: Multi-layer cleanup prevents new connections to terminated runtimes via global registry
27. **Runtime Termination**: Always notify both renderer and main processes when terminating runtimes via IPC
28. **Connection Prevention**: WebSocket proxy checks global cleanup registry before creating new connections
29. **Cleanup Registry**: Use `window.__datalayerRuntimeCleanup` (renderer) and `global.__datalayerRuntimeCleanup` (main) for tracking
30. **Connection Errors**: Some "Connection ws-X not found" errors may persist due to timing of existing connections
