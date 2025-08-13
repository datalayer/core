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

- **Architecture**: Extends `@datalayer/jupyter-react` with Datalayer-specific functionality
- **API layer**: `DatalayerApi.ts` for platform integration
- **Component library**: Datalayer-specific UI, Jupyter extensions, business logic
- **State management**: `DatalayerReactState` extends `JupyterReactState` with typed configuration
- **Collaboration**: `DatalayerCollaborationProvider` for platform-specific collaboration
- **Configuration**: `DatalayerJupyterConfig`, `DatalayerServiceManager` with platform defaults
- **Models**: 70+ TypeScript models for platform resources
- **Hooks**: Custom hooks for auth, platform integration, UI/UX
- **Kernel provisioning**: `DatalayerKernelAPI` class for remote kernels
- **Storybook**: `npm run storybook` (port 6006)

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

## Datalayer Extensions

**Generic Extension Pattern**: Extends `@datalayer/jupyter-react` via composition, not modification
- **Collaboration**: Auto-registers `DatalayerCollaborationProvider` for `collaborative="datalayer"`
- **State Management**: `DatalayerReactState` extends generic `JupyterReactState`  
- **Types**: `DatalayerCollaborationTypes.ts` with platform-specific collaboration config
- **Services**: `DatalayerServiceManager` with platform defaults

```typescript
// All Datalayer providers auto-register on import
<Notebook collaborative="datalayer" ... /> // Works automatically
const { datalayerConfig } = datalayerReactStore.getState();
```

## Recent Updates (Session 2025-08-13)

- Fixed collaboration type definitions (IJupyterCollaborationServer now correctly has type: 'jupyter')
- Made ICollaborationProvider truly generic (`string | undefined`) accepting any provider name
- Moved all Datalayer-specific types from jupyter-ui to core package
- Created comprehensive generic examples in jupyter-ui demonstrating all features
- Updated MIGRATION_JUPYTER_UI.md with complete import change guide

## Dependencies

**IMPORTANT**: Core depends on `@datalayer/jupyter-react` (NOT the reverse)
- Core: `"@datalayer/jupyter-react": "file:../jupyter-ui/packages/react"` (local development)
- Jupyter-ui remains completely generic and platform-agnostic
- All Datalayer-specific functionality is contained in core package
