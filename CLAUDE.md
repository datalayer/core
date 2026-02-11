# CLAUDE.md

Datalayer Core - Python Client and CLI for the Datalayer AI Platform. Hybrid Python/TypeScript codebase with server-side Python and client-side React components.

## ⚠️ CRITICAL: Import/Export Pattern Issue (January 2025)

**NEVER use destructured imports from `src/api/spacer`!**

### The Problem
The spacer API exports use namespace pattern in `src/api/spacer/index.js`:
```javascript
export * as items from './items';
export * as users from './users';
export * as notebooks from './notebooks';
export * as lexicals from './lexicals';
export * as cells from './cells';
```

This creates a structure like `spacerAPI.items`, NOT direct named exports.

### ❌ WRONG - Destructured Import (causes runtime errors):
```javascript
import { items, users, notebooks } from '../../../api/spacer';
const response = await items.getSpaceItems(...);  // ❌ items is undefined
```

### ✅ CORRECT - Namespace Import:
```javascript
import * as spacerAPI from '../../../api/spacer';
const response = await spacerAPI.items.getSpaceItems(...);  // ✅ Works correctly
```

### Why This Happens
- Webpack bundling works fine (no build errors)
- Runtime fails because destructured import `{ items }` expects named export
- Namespace export `export * as items` creates nested structure instead
- Result: `items` becomes `undefined` at runtime, causing "Cannot read properties of undefined"

### Files Fixed (January 2025)
- `lib/client/client/models/Space.js`
- `lib/client/client/models/Notebook.js`
- `lib/client/client/models/Lexical.js`
- `lib/client/client/models/Item.js`

**Always use namespace imports for spacer API!**

## Project Structure

- **Source code**: `src/` contains the TypeScript/React library code
- **API Layer**: `src/api/` contains raw API functions for direct service access
- **Client**: `src/client/client/` contains the high-level Client with models and mixins
- **Examples**: `src/examples/` contains interactive React examples
- **Python**: `datalayer_core/` contains the Python Client
- **Tests**: `src/__tests__/` for TypeScript, `datalayer_core/tests/` for Python
- **No default Vite files**: Removed App.tsx, main.tsx, public/ - this is a library, not an app

## Development Commands

**Python**: `pip install -e .[test]` | `pytest datalayer_core/tests/` | `mypy datalayer_core/`
**TypeScript Library**: `npm install` | `npm run build:lib` | `npm run lint` | `npm run test`
**Integration Tests**: `npm run test:integration` (runs all API and Client integration tests)
**Examples**: `npm run examples` (starts dev server at http://localhost:3000/)
**Code Quality**: `npm run check` | `npm run check:fix` | `npm run lint` | `npm run format` | `npm run type-check`
**Docs**: `cd docs && make build` | `npm run typedoc` (generates TypeScript API docs) | See `API.md` for comprehensive API/Client examples
**Make**: `make build` | `make start` | `make docs`

**CLI Scripts**: `datalayer`/`dla`/`d`, `datalayer-config`, `datalayer-migrate`, `datalayer-server`, `datalayer-troubleshoot`

## Architecture

**Python Core**:

- `DatalayerApp` - Base application class (traitlets)
- `DatalayerClient` - Main Client class with mixins
- CLI with subcommands: about, console, envs, runtimes, login, secrets, snapshots
- Resource management: runtimes, environments, secrets, snapshots

**TypeScript/React**: NPM package `@datalayer/core`

- API layer with `DatalayerApi.ts`
- Component library (UI, Jupyter, business logic)
- Zustand state management
- 70+ TypeScript models
- Custom hooks for auth, platform integration, UI/UX
- Universal navigation system that auto-detects React Router, Next.js, or falls back to native browser navigation

## Configuration

- Environment variables: `DATALAYER_API_KEY`, `DATALAYER_RUN_URL`
- Traitlets configuration with custom Datalayer paths
- Dev setup in `dev/`, examples in `examples/`

## Quality Standards

- **Type checking**: 100% mypy compliance (Python), strict TypeScript checks
- **Testing**: pytest + Vitest with React Testing Library + comprehensive test mocks
- **Linting**: ESLint with React/TypeScript rules, ruff for Python
- **Formatting**: Prettier for consistent code style (80 char width, single quotes)
- **Security**: bandit compliance, replaced `eval()` with `ast.literal_eval()`
- **Documentation**: NumPy-style docstrings, TypeDoc API docs, Docusaurus site
- **Pre-commit**: Updated to latest versions (ruff v0.12.8, bandit 1.8.6, pip-audit v2.9.0)

## Development Tips

- Use npm, not yarn
- Run checks after changes: `npm run check:fix`
- Use playwright MCP servers when you need to check stuff
- Ensure things always build after changes
- Run also npm run format/lint/type-check to ensure all is working properly

## Running Examples

**Start the examples server:**

```bash
npm run examples
```

The examples are served at http://localhost:3000/ and include:

- `DatalayerNotebookExample`: Demonstrates Datalayer services integration with Jupyter notebooks
- `NotebookExample`: Basic notebook example
- `CellExample`: Individual cell execution example

**Next.js Notebook Example:**

Located in `examples/nextjs-notebook/`, this is a full Next.js application demonstrating platform integration:

```bash
cd examples/nextjs-notebook
npm install
npm run dev
```

Features:

- Token authentication with Datalayer IAM
- Browse and create notebooks from workspace
- Select compute environments for execution
- Interactive notebook viewer with real-time outputs
- Clean UI with centered empty states and proper spacing
- Welcome page with token authentication
- Navigation between notebooks, environments, and viewer pages
- Error handling for runtime creation failures

**Configuration:**

- The application uses local storage for token management
- Authentication happens through the welcome page where users enter their Datalayer API token
- The app communicates directly with `https://prod1.datalayer.run` API endpoints
- Built with Next.js 14, TypeScript, and GitHub Primer components

**Desktop Example:**

For a native desktop application with Jupyter integration, see the separate Datalayer Desktop repository:
https://github.com/datalayer/desktop

Features:
- Native desktop app with Electron
- Full Jupyter notebook integration
- Real-time collaboration support
- WebSocket proxy for kernel communication

## TypeScript/React Services

**DatalayerServiceManager**: Creates and configures ServiceManager for Datalayer infrastructure

- Located in `src/services/DatalayerServiceManager.ts`
- Uses the runtime API (`/api/runtimes/v1/runtimes`) to create kernels
- Internally uses `createRuntime` from the API module for proper auth handling
- Returns configured ServiceManager for use with Jupyter components

**DatalayerCollaborationProvider**: Enables real-time collaboration

- Located in `src/collaboration/DatalayerCollaborationProvider.ts`
- Requires Datalayer credentials (runUrl and token)
- Integrates with Jupyter notebooks for collaborative editing
- **IMPORTANT**: Uses notebook UIDs (not paths) for document IDs in Datalayer SaaS
- Collaboration is enabled by default in Notebook2 components

## API Notes

- **Runtime API**: `POST /api/runtimes/v1/runtimes` - Creates compute runtimes
- **Collaboration API**: `/api/spacer/v1/documents/{notebook_uid}` - Works for notebooks (not just documents!)
- **Required Headers**: Authorization (Bearer token), X-External-Token (for some operations)
- **Proxy Setup**: Vite dev server proxies `/api` to `https://prod1.datalayer.run` for CORS
- **API Docs**: Available at https://prod1.datalayer.run/api/runtimes/v1/ui/
- **Pre-commit hooks**: Husky + lint-staged for automatic code quality checks
- **Code Quality Scripts**:
  - `npm run check` - Run all checks (format, lint, type-check)
  - `npm run check:fix` - Auto-fix all issues
  - `npm run lint` / `npm run lint:fix` - ESLint checking
  - `npm run format` / `npm run format:check` - Prettier formatting
  - `npm run type-check` - TypeScript compilation check

## API and Client Architecture

### Two-Layer Architecture

**1. Raw API Layer** (`src/api/`)
- Direct access to REST endpoints
- Organized by service (IAM, Runtimes, Spacer)
- Returns raw API responses
- Minimal abstraction, maximum control

**2. Client Layer** (`src/client/client/`)
- High-level, intuitive interface
- Domain models with rich methods
- Automatic state management
- Mixins for organized functionality

**Client Structure**:
- `storage/`: Platform-agnostic storage implementations (Browser, Node, Electron)
- `state/`: Service-specific state managers with TTL caching
- `models/`: Rich domain models (User, Runtime, Space, Notebook, Lexical, Snapshot)
- `mixins/`: Service mixins (IAMMixin, RuntimesMixin, SpacerMixin, HealthMixin)
- `base.ts`: Client base class composition

### Key Changes and Fixes

**Authentication**:
- Fixed logout endpoint to use GET method (was incorrectly using POST)
- Proper error handling for invalid tokens
- OAuth support limited to GitHub and LinkedIn only (removed Google/Microsoft)

**Model Lifecycle Management**:
- Models track deletion state to prevent operations on deleted resources
- Runtime and Snapshot deletion now marks instances as deleted
- All model methods check deletion state before operations

**Platform Abstraction Layer** (January 2025):
- Implemented PlatformStorage interface with 3 implementations (Browser, Node, Electron)
- State managers with TTL-based caching (IAMState, RuntimesState, SpacerState)
- RuntimesState tracks runtime keys for proper getCachedRuntimes() implementation
- All storage implementations support encryption

**Test Infrastructure**:
- 100% test pass rate achieved (247 tests passing)
- Consolidated test configuration (removed redundant `shouldRunExpensive()`)
- Integration tests are self-contained (no inter-test dependencies)
- Proper cleanup in test teardown
- Environment variable `DATALAYER_TEST_SKIP_EXPENSIVE=false` enables all tests
- Fixed empty string handling in BrowserStorage
- Fixed OAuth provider recognition in User model tests

**TypeScript Improvements**:
- Fixed strict null checks in model constructors
- Proper typing for Client mixins and models
- Consistent error handling across all models
- Fixed unused variable warnings in test files

### Client Models

**Runtime Model**:
- Dynamic state checking (always fetches fresh from API)
- `waitUntilReady()` method for startup synchronization
- Direct snapshot creation via `createSnapshot()`
- Deletion state tracking

**Snapshot Model**:
- Status and size checking methods
- Metadata access
- Relationship with Runtime model
- Deletion state tracking

**Space Model**:
- Item listing with proper relationship handling
- Support for both Notebooks and Lexical documents
- Lazy loading of properties

**Notebook/Lexical Models**:
- Content management
- Update operations
- Proper serialization to JSON
- Deletion lifecycle

## AI Notes IMPORTANT

- Use npm, not yarn
- Run checks after changes:
  - npm run format
  - npm run lint
  - npm run type-check
  - npm run build:lib (ensure it builds with fresh output)
- Run integration tests: `npm run test:integration`
- Avoid old-school require imports
- Use playwright MCP to inspect things directly
- Check API.md for comprehensive examples of both raw API and Client usage
- **Client Usage**: Always use the handlers pattern for cross-cutting concerns instead of wrapping Client methods
- **VS Code Extension**: Use `(sdk as any)` casting when TypeScript definitions are incomplete

## ag-ui (CopilotKit) Architecture (November 2024)

### Critical Fix: Separated Hook Files

The ag-ui adapter uses **separated hook files** to prevent Lumino widget initialization crashes:

**Files:**

- `src/tools/adapters/agui/notebookHooks.tsx` - Notebook-only (imports `@datalayer/jupyter-react`)
- `src/tools/adapters/agui/lexicalHooks.tsx` - Lexical-only (imports `@datalayer/jupyter-lexical`)
- `src/tools/adapters/agui/AgUIToolAdapter.ts` - Shared components (`ActionRegistrar`, `UseFrontendToolFn`)

**Problem Solved:**

Original combined `hooks.tsx` imported from BOTH packages, causing:

1. When `useNotebookToolActions` was called → entire lexical package loaded
2. Lexical package initialization → creates Lumino widgets for Jupyter output nodes
3. Lumino widget initialization → **CRASH**: `Cannot set properties of undefined (setting 'class-name')`

**Solution Benefits:**

- ✅ Notebook example never loads lexical code (no crash)
- ✅ Lazy loading (lexical only loads when needed)
- ✅ No code duplication (shared components in `AgUIToolAdapter.ts`)
- ✅ Smaller bundles (tree-shaking eliminates unused code)

**Critical Rule:**

```typescript
// ❌ NEVER create combined hooks that import from both packages
import { ... } from '@datalayer/jupyter-lexical';
import { ... } from '@datalayer/jupyter-react';

// ✅ ALWAYS keep hooks separated by package
// notebookHooks.tsx
import { ... } from '@datalayer/jupyter-react';

// lexicalHooks.tsx
import { ... } from '@datalayer/jupyter-lexical';
```

## Critical Lessons Learned (January 2025)

### Module Import/Export Issues
**Problem**: Webpack couldn't resolve namespace exports when destructured in consuming code.
**Symptom**: Runtime error "Cannot read properties of undefined (reading 'getSpaceItems')"
**Root Cause**: Using `export * as items from './items'` in index files, then importing as `import * as spacerAPI` and accessing `spacerAPI.items.getSpaceItems()`
**Solution**: Use direct module imports instead:
```typescript
// BAD - webpack can't resolve this properly
import * as spacerAPI from '../../../api/spacer';
await spacerAPI.items.getSpaceItems(...);

// GOOD - direct imports work
import * as items from '../../../api/spacer/items';
await items.getSpaceItems(...);
```

### Code Deduplication with Abstract Base Classes
**Achievement**: Reduced code duplication by 45-47% across models
**Pattern**: Created `Item<TData, TUpdateRequest>` abstract base class for Notebook, Lexical, and Cell models
**Benefits**:
- Single source of truth for common functionality
- Consistent deletion state tracking
- Unified error handling

### Build System Improvements
**Issue**: Stale build artifacts causing confusion
**Solution**: Added clean scripts to all build commands
- `build:lib` now runs `npm run clean:lib` first
- Removes `lib/`, `dist/`, `build/`, and `tsconfig.tsbuildinfo`
- Ensures fresh builds every time

### TypeScript Module Resolution
**Issue**: Node.js ESM requires explicit file extensions in imports
**Context**: Only matters for direct Node.js execution, not webpack bundles
**Note**: TypeScript source files don't need .js extensions - only needed if running compiled JS directly with Node

### Debugging Approach
**Key Learning**: When fixing runtime errors in webpack bundles:
1. Check the actual TypeScript source files, not compiled JavaScript
2. Webpack module resolution differs from Node.js ESM
3. Clean rebuild (`rm -rf dist lib node_modules`) can resolve mysterious issues
4. Always verify fixes actually work in the runtime environment

## Client Handlers Pattern (January 2025)

### Problem Solved
Eliminated massive code duplication where consuming applications (VS Code extension, React apps) were wrapping every Client method 1:1 just to add logging, error handling, or platform-specific behavior.

### Solution: Handlers Pattern
The Client now supports lifecycle handlers that can be injected at initialization:

```typescript
const sdk = new DatalayerClient({
  token: 'your-token',
  iamRunUrl: 'https://prod1.datalayer.run',
  handlers: {
    beforeCall: async (methodName, args) => {
      console.log(`[Client] Calling ${methodName}`, args);
    },
    afterCall: async (methodName, result) => {
      console.log(`[Client] ${methodName} completed`, result);
    },
    onError: async (methodName, error) => {
      console.error(`[Client] ${methodName} failed`, error);
      // Platform-specific error handling
      if (error.message.includes('Not authenticated')) {
        // Show platform-specific auth prompt
      }
    }
  }
});
```

### Key Implementation Details

**Automatic Method Wrapping**: The Client automatically wraps all mixin methods with handlers:
- Located in `src/client/client/base.ts`
- Smart detection: Only wraps mixin methods, not base class infrastructure
- No hardcoded method lists - automatically detects based on prototype chain

**Clean Mixin Composition**: Uses helper function for readable mixin composition:
```typescript
const DatalayerClientWithMixins = composeMixins(
  IAMMixin,
  RuntimesMixin,
  SpacerMixin,
);
```

**TypeScript Support**: Proper interface declaration for mixin methods:
```typescript
export interface DatalayerClient {
  // All mixin methods declared here for TypeScript
  whoami(): Promise<any>;
  createRuntime(config: any): Promise<any>;
  // ... etc
}
```

### Benefits
- **Zero code duplication**: No more wrapper services
- **Platform agnostic**: Same Client works everywhere
- **Clean separation**: Business logic in Client, platform behavior in handlers
- **Type safe**: Full TypeScript support
- **Maintainable**: Add new Client methods without updating consumers

### Removed Components
- Deleted `HealthMixin` (unnecessary complexity)
- VS Code extension: Removed `spacerService.ts` and `runtimeService.ts`
- All wrapper services replaced with direct Client usage + handlers
