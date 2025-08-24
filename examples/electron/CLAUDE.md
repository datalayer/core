# CLAUDE.md - Electron Example

This document contains important configuration and troubleshooting information for the Datalayer Electron example application.

## Quick Start

```bash
npm install
npm start  # Runs in development mode with hot-reload
npm run dist:mac  # Build production app for macOS
```

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

3. **Custom Import Resolver for JupyterLab**

   ```typescript
   {
     name: 'fix-jupyterlab-deep-imports',
     resolveId(source) {
       if (source.startsWith('@jupyterlab/services/lib/')) {
         const path = source.replace('@jupyterlab/services/lib/', '');
         return resolve(__dirname, `../../node_modules/@jupyterlab/services/lib/${path}`);
       }
       return null;
     },
   }
   ```

4. **Lodash Bundling Fix Plugin**

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

5. **Optimized Dependencies**
   ```typescript
   optimizeDeps: {
     include: [
       'json5',
       'react',
       'react-dom',
       'react/jsx-runtime',
       'lodash',
       'lodash-es'
     ],
     esbuildOptions: {
       loader: { '.js': 'jsx' }, // Handle JSX in .js files
     },
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

## Known Issues

### Production Build CJS/ESM Issues

- **Problem**: Production builds may fail with "Module not exported" errors from JupyterLab packages
- **Solution**: Use `npm start` for development which handles module resolution dynamically
- **Root Cause**: Complex re-exports in @jupyterlab/services that don't work well with static bundling

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
npm run build         # Build for production (may have issues)
npm run dist:mac      # Package for macOS
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

### API Integration

- Proxies `/api` requests to `https://prod1.datalayer.run`
- Uses Bearer token authentication
- WebSocket proxy for kernel communication
- Collaboration uses notebook UIDs (not paths)

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

## Important Files

- `electron.vite.config.ts` - Vite configuration with CJS/ESM fixes and lodash bundling solutions
- `src/main/index.ts` - Main process with console safety wrappers
- `src/renderer/main.tsx` - Entry point with critical polyfill imports
- `src/renderer/utils/lodash-polyfills.js` - Lodash internal data structure implementations
- `src/renderer/services/proxyServiceManager.ts` - WebSocket proxy for kernels
- `src/renderer/components/NotebookView.tsx` - Jupyter notebook integration

## Dependencies to Note

- `@rollup/plugin-commonjs` - Critical for CJS/ESM handling
- `electron-vite` - Build tool for Electron + Vite
- `vite-plugin-string` - Handles raw CSS imports
- `@datalayer/jupyter-react` - Jupyter components
- `@jupyterlab/services` - Kernel and session management

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
