# Development Guide - @datalayer/core

This document provides comprehensive information for developers working on the `@datalayer/core` package.

## Prerequisites

- Node.js >= 20.0.0 and < 21.0.0
- npm (not yarn)
- Python 3.11+ (for Python components)

## Setup

```bash
# Install dependencies
npm install

# Build library
npm run build:lib

# Watch for changes (development)
npm run watch:lib

# Run type checking
npm run type-check

# Start Storybook
npm run storybook
```

## Working with Jupyter Packages

The `@datalayer/core` package depends on `@datalayer/jupyter-lexical` and `@datalayer/jupyter-react` from the jupyter-ui monorepo. During development, you may need to sync changes from those packages.

### Development Scripts

```bash
# Sync latest changes from jupyter-ui packages
npm run sync:jupyter
# Builds jupyter-lexical and jupyter-react, copies lib/ to node_modules

# Watch mode - auto-sync on file changes
npm run sync:jupyter:watch
# Monitors src/ folders and automatically rebuilds/syncs when files change

# Create patches for modified packages
npm run create:patches
# Auto-syncs first, then generates patch files in patches/

# Apply patches manually (if needed)
npm run apply:patches
# Normally runs automatically via postinstall hook
```

### Workflow

1. **Make changes** in `../jupyter-ui/packages/lexical` or `../jupyter-ui/packages/react`
2. **Option A - Manual sync**: `npm run sync:jupyter` when ready to test
3. **Option B - Auto sync**: `npm run sync:jupyter:watch` in a separate terminal for live updates
4. **Test changes**: Run Storybook or build examples (`npm run storybook` or `npm run examples`)
5. **Create patches**: `npm run create:patches` (when ready to commit)

The patches in `patches/` directory are automatically applied when anyone runs `npm install`, ensuring all contributors get your modifications.

## Code Quality & Validation

The project enforces strict quality standards.

### Validation Commands

```bash
# Type checking (TypeScript compilation)
npm run type-check
# Runs: tsc --noEmit

# Build types
npm run build:types
# Compiles TypeScript to .d.ts files

# Linting (ESLint)
npm run lint
# Checks code style

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
# Uses Prettier to format code

# Check formatting
npm run format:check

# Run all checks
npm run check
# Equivalent to: format:check + lint:all + type-check:all

# Auto-fix all issues
npm run check:fix
# Equivalent to: format:all + lint:fix + type-check:all
```

## Project Structure

```
@datalayer/core/
├── src/                    # TypeScript source files
│   ├── api/               # API client implementations
│   ├── components/        # React components
│   ├── client/               # Client client models
│   ├── services/          # Service layer
│   └── utils/             # Utility functions
├── lib/                    # Compiled JavaScript (git-ignored)
├── dist/                   # Vite build output (git-ignored)
├── patches/               # patch-package patches for dependencies
├── scripts/               # Build and development scripts
│   ├── sync-jupyter.sh    # Sync jupyter-ui packages
│   ├── create-patches.sh  # Generate patches
│   └── apply-patches.sh   # Apply patches
├── examples/              # Example applications
├── docs/                  # Documentation
└── dev/                   # Developer documentation
    └── DEVELOPMENT.md     # This file
```

## Building

### Library Build

```bash
# Clean and full build (lib + dist)
npm run build

# Build only lib/ (faster for development)
npm run build:lib

# Build only types
npm run build:types

# Clean build artifacts
npm run clean
npm run clean:lib
npm run clean:dist
```

### Watch Mode

```bash
# Watch lib/ (TypeScript compilation + resources)
npm run watch:lib

# Watch only TypeScript compilation
npm run watch:lib:src

# Watch only resources
npm run watch:lib:res
```

## Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

## Storybook

```bash
# Start Storybook development server
npm run storybook

# Build Storybook for deployment
npm run build-storybook
```

## Examples

```bash
# Run example with Vite
npm run examples

# Run example with fresh Vite cache (recommended after patches)
npm run examples:fresh

# Run Next.js example
npm run examples:nextjs

# Build examples
npm run build:examples
npm run build:nextjs
```

### Cache Management

Vite caches compiled modules in `node_modules/.vite`, which can cause issues when testing patches or modified dependencies.

```bash
# Clear Vite cache only
npm run clean:cache

# Run example with fresh cache (clears cache first)
EXAMPLE=AgUIExample npm run examples:fresh

# Nuclear option: rebuild everything with fresh cache
npm run rebuild:fresh
# This does: create:patches → npm install → build → clean:cache
```

**When to clear cache:**
- After creating/applying patches
- After modifying jupyter-ui dependencies
- When tool operations aren't reflecting in browser
- When you see stale compiled code

**Quick workflow after jupyter-ui changes:**
```bash
# Full rebuild with fresh cache
npm run rebuild:fresh

# Then start example
EXAMPLE=AgUIExample npm run examples
```

## Patch Management

### Why Patches?

The core package uses `patch-package` to maintain local modifications to `@datalayer/jupyter-lexical` and `@datalayer/jupyter-react`. This allows us to:

1. Test changes from jupyter-ui packages before they're published
2. Maintain custom modifications if needed
3. Ensure all developers have the same package versions with modifications

### Creating Patches

After modifying jupyter-ui packages and syncing them:

```bash
# This will:
# 1. Build and sync latest jupyter-ui packages
# 2. Generate patch files in patches/
npm run create:patches
```

### Applying Patches

Patches are automatically applied during `npm install` via the postinstall hook. To manually apply:

```bash
npm run apply:patches
```

### Patch Files

Patches are stored in `patches/` directory:
- `@datalayer+jupyter-lexical+1.0.6.patch`
- `@datalayer+jupyter-react+1.1.8.patch`

**Important**: Commit patch files to the repository so all developers get the same modifications.

## TypeScript Configuration

The project uses multiple TypeScript configurations:

- `tsconfig.json` - Base configuration (references others)
- `tsconfig.app.json` - Application code configuration
- `tsconfig.node.json` - Node.js code configuration

## Documentation

```bash
# Generate TypeScript API documentation
npm run typedoc
```

Documentation is generated to `docs/docs/typescript_api/`.

## Python Components

The core package also includes Python components:

```bash
# Install Python dependencies
make install

# Run Python tests
make test

# Build Python package
make build
```

## CI/CD

The project uses GitHub Actions for continuous integration. All PRs must pass:

1. TypeScript compilation
2. ESLint checks
3. Unit tests
4. Integration tests

## ag-ui (CopilotKit) Architecture

### Hook Organization

The ag-ui adapter uses **separated hook files** to prevent unnecessary package loading:

- **`src/tools/adapters/agui/notebookHooks.tsx`** - Notebook-only functionality
  - Imports: `@datalayer/jupyter-react` only
  - Exports: `useNotebookToolActions`, `ActionRegistrar`, `UseFrontendToolFn`
  - Used by: `AgUINotebookExample.tsx`

- **`src/tools/adapters/agui/lexicalHooks.tsx`** - Lexical-only functionality
  - Imports: `@datalayer/jupyter-lexical` only
  - Exports: `useLexicalToolActions`, `ActionRegistrar`, `UseFrontendToolFn`
  - Used by: `AgUILexicalExample.tsx`

- **`src/tools/adapters/agui/AgUIToolAdapter.ts`** - Shared components
  - Exports: `ActionRegistrar`, `UseFrontendToolFn`, `createAllCopilotKitActions`
  - Both hook files import and re-export these shared components

### Why This Architecture?

**Critical Fix (November 2024)**: The original combined `hooks.tsx` file caused crashes because:

1. It imported from **both** `@datalayer/jupyter-lexical` and `@datalayer/jupyter-react`
2. When `useNotebookToolActions` was called, the entire lexical package loaded
3. Lexical package initialization includes Jupyter output nodes that create Lumino widgets
4. Lumino widget initialization failed with: `Cannot set properties of undefined (setting 'class-name')`

**Solution**: Split into separate files so:

- Notebook example **never loads** lexical code → No crash
- Lexical example **only loads** when actually needed → Lazy loading
- Shared components consolidated in `AgUIToolAdapter.ts` → No duplication
- Tree-shaking can eliminate unused code → Smaller bundles

### Important Rules

**DO NOT** create a combined hooks file that imports from both packages:

```typescript
// ❌ BAD - This will cause crashes!
import { ... } from '@datalayer/jupyter-lexical';
import { ... } from '@datalayer/jupyter-react';
```

**DO** keep hooks separated by package:

```typescript
// ✅ GOOD - notebookHooks.tsx
import { ... } from '@datalayer/jupyter-react';

// ✅ GOOD - lexicalHooks.tsx
import { ... } from '@datalayer/jupyter-lexical';
```

## Common Issues

### Issue: Changes in jupyter-ui not reflected

**Solution**: Run `npm run sync:jupyter` to rebuild and copy latest changes.

### Issue: Patch application fails

**Solution**:

1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install` again
3. If still failing, regenerate patches with `npm run create:patches`

### Issue: Type errors in imported packages

**Solution**: Ensure jupyter-ui packages are built with `npm run sync:jupyter`.

### Issue: AgUINotebookExample crashes with "Cannot set properties of undefined"

**Cause**: Importing from a combined hooks file that loads both lexical and react packages.

**Solution**: Ensure you're importing from the correct separated hook file:

- For notebooks: `import { ... } from '../tools/adapters/agui/notebookHooks'`
- For lexical: `import { ... } from '../tools/adapters/agui/lexicalHooks'`

## Contributing

1. Make your changes in the appropriate directory
2. Run validation: `npm run check`
3. Fix any issues: `npm run check:fix`
4. Test your changes: `npm run test`
5. If modifying jupyter-ui dependencies: `npm run create:patches`
6. Commit your changes including patch files

## Resources

- [Main Repository](https://github.com/datalayer/core)
- [Jupyter UI Repository](https://github.com/datalayer/jupyter-ui)
- [Storybook Documentation](https://storybook.js.org/)
- [patch-package Documentation](https://github.com/ds300/patch-package)

---

*Last Updated: November 2024*
