# CLAUDE.md

Datalayer Core - Python SDK and CLI for the Datalayer AI Platform. Hybrid Python/TypeScript codebase with server-side Python and client-side React components.

## Project Structure

- **Source code**: `src/` contains the TypeScript/React library code
- **Examples**: `src/examples/` contains interactive React examples
- **Python**: `datalayer_core/` contains the Python SDK
- **Tests**: `src/__tests__/` for TypeScript, `datalayer_core/tests/` for Python
- **No default Vite files**: Removed App.tsx, main.tsx, public/ - this is a library, not an app

## Development Commands

**Python**: `pip install -e .[test]` | `pytest datalayer_core/tests/` | `mypy datalayer_core/`
**TypeScript Library**: `npm install` | `npm run build:lib` | `npm run lint` | `npm run test`
**Examples**: `npm run example` (starts dev server at http://localhost:3000/)
**Docs**: `cd docs && make build` | `npm run typedoc` (generates TypeScript API docs)
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

## Configuration

- Environment variables: `DATALAYER_TOKEN`, `DATALAYER_RUN_URL`
- Traitlets configuration with custom Datalayer paths
- Dev setup in `dev/`, examples in `examples/`

## Quality Standards

- **Type checking**: 100% mypy compliance (102 files)
- **Testing**: pytest + Vitest with React Testing Library + comprehensive test mocks
- **Linting**: ESLint (0 errors), ruff, prettier - all passing
- **Security**: bandit compliance, replaced `eval()` with `ast.literal_eval()`
- **Documentation**: NumPy-style docstrings, TypeDoc API docs, Docusaurus site
- **Pre-commit**: Updated to latest versions (ruff v0.12.8, bandit 1.8.6, pip-audit v2.9.0)

## Development Tips

- Use npm, not yarn
- Prefer editing over creating files
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

**Configuration:**

- Set `VITE_DATALAYER_API_TOKEN` in `.env` file for authentication
- Examples use Vite proxy to handle CORS for API calls to prod1.datalayer.run
- Select which example to run in `vite.examples.config.ts`

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

## API Notes

- **Runtime API**: `POST /api/runtimes/v1/runtimes` - Creates compute runtimes
- **Required Headers**: Authorization (Bearer token), X-External-Token (for some operations)
- **Proxy Setup**: Vite dev server proxies `/api` to `https://prod1.datalayer.run` for CORS
- **API Docs**: Available at https://prod1.datalayer.run/api/runtimes/v1/ui/
