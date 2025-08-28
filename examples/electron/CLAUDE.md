# CLAUDE.md - Electron Example

This document contains important configuration and troubleshooting information for the Datalayer Electron example application.

## Quick Start

```bash
npm install
npm start  # Runs in development mode with hot-reload
```

## CJS/ESM Module Resolution Configuration

The Electron app uses a custom Vite configuration to handle the complex module ecosystem of Jupyter packages. Here's what's configured:

### Key Configuration in `electron.vite.config.ts`

1. **React Automatic JSX Runtime**
   ```typescript
   react({
     jsxRuntime: 'automatic', // Avoids CJS/ESM conflicts with React 17+
   })
   ```

2. **CommonJS Plugin for Rollup**
   ```typescript
   commonjs({
     transformMixedEsModules: true,
     include: [/node_modules/, /\.js$/],
     requireReturnsDefault: 'auto',
   })
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

4. **Optimized Dependencies**
   ```typescript
   optimizeDeps: {
     include: ['json5', 'react', 'react-dom', 'react/jsx-runtime'],
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

- `electron.vite.config.ts` - Vite configuration with CJS/ESM fixes
- `src/main/index.ts` - Main process with console safety wrappers
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