# CLAUDE.md

Datalayer Core - Python SDK and CLI for the Datalayer AI Platform. Hybrid Python/TypeScript codebase with server-side Python and client-side React components.

## Project Structure

- **Source code**: `src/` contains the TypeScript/React library code
- **API Layer**: `src/api/` contains raw API functions for direct service access
- **SDK Client**: `src/sdk/client/` contains the high-level SDK with models and mixins
- **Examples**: `src/examples/` contains interactive React examples
- **Python**: `datalayer_core/` contains the Python SDK
- **Tests**: `src/__tests__/` for TypeScript, `datalayer_core/tests/` for Python
- **No default Vite files**: Removed App.tsx, main.tsx, public/ - this is a library, not an app

## Development Commands

**Python**: `pip install -e .[test]` | `pytest datalayer_core/tests/` | `mypy datalayer_core/`
**TypeScript Library**: `npm install` | `npm run build:lib` | `npm run lint` | `npm run test`
**Integration Tests**: `npm run test:integration` (runs all API and SDK integration tests)
**Examples**: `npm run example` (starts dev server at http://localhost:3000/)
**Code Quality**: `npm run check` | `npm run check:fix` | `npm run lint` | `npm run format` | `npm run type-check`
**Docs**: `cd docs && make build` | `npm run typedoc` (generates TypeScript API docs) | See `API.md` for comprehensive API/SDK examples
**Make**: `make build` | `make start` | `make docs`

**CLI Scripts**: `datalayer`/`dla`/`d`, `datalayer-config`, `datalayer-migrate`, `datalayer-server`, `datalayer-troubleshoot`

## Architecture

**Python Core**:

- `DatalayerApp` - Base application class (traitlets)
- `DatalayerClient` - Main SDK class with mixins
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

- Environment variables: `DATALAYER_TOKEN`, `DATALAYER_RUN_URL`
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
npm run example
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

**Electron Example:**

Located in `examples/electron/`, a desktop application with Jupyter integration:

```bash
cd examples/electron
npm install
npm start  # Uses dev mode to handle CJS/ESM issues
```

Features:

- Native desktop app with Electron
- Full Jupyter notebook integration
- Real-time collaboration support
- WebSocket proxy for kernel communication
- Custom Vite config for CJS/ESM module resolution

**Important Electron Configuration Notes:**

- Uses automatic JSX runtime to avoid React import issues
- Includes @rollup/plugin-commonjs for mixed module formats
- Custom resolver for @jupyterlab/services deep imports
- Safe console logging to prevent EPIPE errors in main process
- Development mode (`npm start`) handles module resolution better than production builds
- See `examples/electron/CLAUDE.md` for detailed troubleshooting

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

## API and SDK Architecture

### Two-Layer Architecture

**1. Raw API Layer** (`src/api/`)
- Direct access to REST endpoints
- Organized by service (IAM, Runtimes, Spacer)
- Returns raw API responses
- Minimal abstraction, maximum control

**2. SDK Client Layer** (`src/sdk/client/`)
- High-level, intuitive interface
- Domain models with rich methods
- Automatic state management
- Mixins for organized functionality

**SDK Client Structure**:
- `storage/`: Platform-agnostic storage implementations (Browser, Node, Electron)
- `state/`: Service-specific state managers with TTL caching
- `models/`: Rich domain models (User, Runtime, Space, Notebook, Lexical, Snapshot)
- `mixins/`: Service mixins (IAMMixin, RuntimesMixin, SpacerMixin, HealthMixin)
- `base.ts`: SDK base class composition

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
- Proper typing for SDK mixins and models
- Consistent error handling across all models
- Fixed unused variable warnings in test files

### SDK Models

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
  - npm run build (ensure it builds)
- Run integration tests: `npm run test:integration`
- Avoid old-school require imports
- Use playwright MCP to inspect things directly
- Check API.md for comprehensive examples of both raw API and SDK usage
