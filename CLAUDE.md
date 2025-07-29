# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Datalayer Core is the foundational Python SDK and CLI for the Datalayer AI Platform. It provides authentication, runtime management, code execution capabilities, and serves as the base foundation for other Datalayer packages. The project is a hybrid Python/TypeScript codebase with both server-side Python components and client-side React/TypeScript components.

## Development Commands

### Python Development

- **Install for development**: `pip install -e .[test]`
- **Run tests**: `pytest datalayer_core/tests/`
- **Type checking**: `mypy datalayer_core/` (all files now pass mypy type checking as of January 2025)
- **Linting**: Pre-commit hooks handle linting with ruff and prettier

### JavaScript/TypeScript Development

- **Install dependencies**: `npm install`
- **Development server**: `npm run dev` or `npm start`
- **Build**: `npm run build` (runs tsc -b && vite build)
- **Lint**: `npm run lint` (uses eslint)
- **Storybook**: `npm run storybook` (dev on port 6006) or `npm run build-storybook`
- **Type documentation**: `npm run typedoc`

### Make Commands

- **Build**: `make build`
- **Clean**: `make clean`
- **Start Jupyter server**: `make start` (runs ./dev/sh/start-jupyter-server.sh)
- **Kill processes**: `make kill` (runs ./dev/sh/kill.sh)
- **Build docs**: `make docs` (builds API docs and serves them)
- **Python API docs**: `make pydoc`
- **TypeScript API docs**: `make typedoc`

### CLI Scripts

The package provides several CLI entry points:

- `datalayer` / `dla` / `d` - Main CLI application
- `datalayer-config` - Configuration management
- `datalayer-migrate` - Migration utilities
- `datalayer-server` - Server application
- `datalayer-troubleshoot` - Troubleshooting tools

## Code Architecture

### Core Python Components

**Base Application Layer** (`datalayer_core/application.py`):

- `DatalayerApp` - Base class for all Datalayer applications
- Inherits from traitlets Application with custom configuration paths
- Provides standard config loading, logging, and command-line parsing
- All Datalayer apps should inherit from this class

**SDK Layer** (`datalayer_core/sdk/`):

- `DatalayerClient` - Main SDK class combining multiple mixins
- Provides authentication, runtime creation, code execution capabilities
- Uses context managers for automatic resource cleanup
- Mixins: `RuntimesMixin`, `EnvironmentsMixin`, `SecretsMixin`, `SnapshotsMixin`

**CLI Layer** (`datalayer_core/cli/`):

- `DatalayerCLI` - Main CLI application with subcommands
- Subcommands include: about, benchmarks, console, envs, runtimes, login, logout, secrets, snapshots, web, whoami
- `DatalayerCLIBaseApp` - Base class for CLI applications

**Resource Management**:

- **Runtimes** (`datalayer_core/runtimes/`) - Compute runtime management with subcommands for create, start, stop, pause, terminate, exec, list
- **Environments** (`datalayer_core/environments/`) - Environment listing and management
- **Secrets** (`datalayer_core/secrets/`) - Secret management with create, delete, list operations
- **Snapshots** (`datalayer_core/snapshots/`) - Snapshot management with create, delete, list operations

**Web Components**:

- **Handlers** (`datalayer_core/handlers/`) - HTTP request handlers for config, index, login, service workers
- **Server Application** (`datalayer_core/serverapplication.py`) - Jupyter server extension

### TypeScript/React Components

The project includes a React-based frontend with Storybook for component development:

- **Main components** in `src/` with TypeScript
- **Storybook stories** in `src/stories/`
- **Build system** using Vite with TypeScript compilation

## Configuration and Setup

**Configuration Management**:

- Uses traitlets for configuration with custom Datalayer paths
- Config files located in datalayer config directories
- Environment variables: `DATALAYER_TOKEN`, `DATALAYER_RUN_URL`

**Authentication**:

- Token-based authentication via `DATALAYER_TOKEN` environment variable
- Login/logout functionality through CLI and SDK

**Development Environment**:

- Development notebooks and scripts in `dev/` directory
- Example applications in `examples/` (FastAPI + scikit-learn, Streamlit + scikit-learn)
- Jupyter server configuration in `dev/config/`

## Testing

- **Python tests**: Located in `datalayer_core/tests/`
- **Test dependencies**: pytest, pytest-asyncio, pytest-cov, pytest_jupyter, pytest-tornasync
- **Coverage**: Uses coverage.py with HTML reports
- **Type checking**: mypy without exclusions - all 102 source files pass type checking

## Pre-commit Hooks

The project uses pre-commit hooks for code quality:

- **ruff**: Python linting and formatting (check and format)
- **prettier**: Code formatting for non-Python files
- **numpydoc-validation**: Documentation validation
- **Standard hooks**: check-toml, check-yaml, end-of-file-fixer, trailing-whitespace

## Documentation

- **Python API docs**: Generated with pydoc-markdown
- **TypeScript API docs**: Generated with typedoc
- **Main docs**: Docusaurus-based documentation in `docs/` directory
- **Examples**: Comprehensive examples in `examples/` directory demonstrating FastAPI and Streamlit integrations

## Build and Distribution

- **Python packaging**: Uses hatchling build system
- **Version management**: Version stored in `datalayer_core/__version__.py`
- **Distribution targets**: PyPI and Conda
- **JavaScript packaging**: NPM package with TypeScript declarations

## Code Quality Status

### Type Checking (January 2025)

The codebase has achieved 100% mypy type checking compliance:

- **Total files checked**: 102 source files
- **Mypy errors**: 0 (previously 31 errors across 4 files)
- **Key fixes applied**:
  - HTTP server type compatibility issues (`authn/http_server.py`)
  - Windows API cross-platform compatibility (`paths.py`)
  - Missing type annotations for internal helper functions
  - Test file function signatures and subprocess handling
  - UUID type conversions for API compatibility

All Python files now include proper type annotations and pass strict mypy checking without exclusions.

### Documentation Standards (Updated January 2025)

- **NumPy-style docstrings**: All public APIs follow NumPy documentation standards
- **Pre-commit validation**: numpydoc-validation hook ensures docstring quality
- **Comprehensive coverage**: Functions, classes, methods, and parameters documented
- **Full compliance achieved**: All numpydoc validation errors resolved across core SDK files
- **Key improvements**:
  - Fixed parameter documentation spacing (added spaces before colons)
  - Added missing parameter descriptions with proper punctuation
  - Corrected infinitive verb usage in function summaries
  - Added module docstrings to all Python files

## Examples Directory

### PyTorch GPU Workloads Example (January 2025)

**Location**: `examples/pytorch-workloads/`

A comprehensive GPU acceleration demonstration showcasing PyTorch performance benefits:

**Key Features**:

- **Dual benchmark system**: Matrix multiplication + convolution operations
- **Performance comparison**: CPU vs GPU execution with timing and GFLOPS metrics
- **Realistic workloads**: 10,000x10,000 matrix operations and CNN-style convolutions (48 batch size, 180 channels, 640x640 images)
- **Reproducible results**: Deterministic operations with proper CUDA synchronization
- **Comprehensive documentation**: Complete README with benchmark explanations

**Files**:

- `main.py` - Benchmark execution script using Datalayer SDK
- `benchmark.py` - Core benchmark functions with proper NumPy docstrings
- `requirements.txt` - PyTorch dependency
- `README.md` - Complete documentation with usage examples

**Performance Results**:

- Matrix multiplication: ~20x GPU speedup
- Convolution operations: ~80x GPU speedup
- Average combined speedup: ~50x faster on GPU

**Integration**:

- Updated main examples README with new "High-Performance Computing" section
- Follows established example patterns (FastAPI, Streamlit integrations)
- Proper error handling and timeout configuration for heavy workloads

### Datalayer Decorator Example (January 2025)

**Location**: `examples/decorator/`

A comprehensive demonstration of the `@datalayer` decorator for seamless remote function execution:

**Key Features**:

- **Function Decoration**: Transform regular Python functions into distributed computations
- **Remote Execution**: Execute functions on cloud-based Datalayer runtimes with different environments
- **Variable Management**: Input/output mapping between local and remote execution contexts
- **Snapshot Integration**: Use pre-configured runtime snapshots for consistent environments
- **Multiple Examples**: Four distinct use cases covering different decorator patterns

**Files**:

- `main.py` - Four comprehensive decorator examples with proper NumPy docstrings
- `README.md` - Complete documentation with usage patterns and parameter reference

**Example Patterns**:

1. **Simple Computation**: Basic function decoration with `@datalayer(runtime_name="my-runtime", environment="ai-env")`
2. **Data Processing**: Input/output variable mapping with `inputs=["data"], output="processed_result"`
3. **Machine Learning**: Model training with debug mode and scikit-learn integration
4. **Data Analysis**: Snapshot-based execution with `snapshot_name="data-analysis-env"`

**Integration**:

- Added new "SDK Fundamentals" section to main examples README
- Positioned before Web Frameworks to highlight core SDK capabilities
- Complete NumPy-style docstrings for all functions (passes numpydoc validation)
- Type hints and comprehensive error handling
