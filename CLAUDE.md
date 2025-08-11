# CLAUDE.md

Datalayer Core - Python SDK and CLI for the Datalayer AI Platform. Hybrid Python/TypeScript codebase with server-side Python and client-side React components.

## Development Commands

**Python**: `pip install -e .[test]` | `pytest datalayer_core/tests/` | `mypy datalayer_core/`
**TypeScript**: `npm install` | `npm run dev` | `npm run build` | `npm run lint` | `npm run test`
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
