[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# ☰ ⭕ Datalayer Core

<p align="center">
  <strong>Python and Typescript libraries for Datalayer</strong>
</p>

<p align="center">
  <a href="https://pypi.org/project/datalayer-core/"><img src="https://img.shields.io/pypi/v/datalayer-core.svg" alt="PyPI version"></img></a>
  <a href="https://pypi.org/project/datalayer-core/"><img src="https://img.shields.io/pypi/pyversions/datalayer-core.svg" alt="Python versions"></img></a>
  <a href="https://github.com/datalayer/core/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-BSD%203--Clause-blue.svg" alt="License"></img></a>
  <a href="https://datalayer.ai/docs/"><img src="https://img.shields.io/badge/docs-datalayer.app-blue" alt="Documentation"></img></a>
  <a href="https://github.com/datalayer/core/actions/workflows/py-tests.yml"><img src="https://github.com/datalayer/core/actions/workflows/py-tests.yml/badge.svg" alt="Units Tests"></img></a><a href="https://github.com/datalayer/core/actions/workflows/ts-tests.yml"><img src="https://github.com/datalayer/core/actions/workflows/ts-tests.yml/badge.svg" alt="Units Tests"></img></a>
</p>

## Overview

Datalayer Core is the foundational package that powers the [Datalayer AI Platform](https://datalayer.ai). It provides a TypesScript and Python packages as a Command Line Interface (CLI) for AI engineers, data scientists, and researchers to seamlessly integrate scalable compute runtimes into their workflows.

This package serves as the base foundation used by many other Datalayer packages, containing core application classes, configuration, and unified APIs for authentication, runtime management, and code execution in cloud-based environments.

## Key Features

- **🔐 Simple Authentication**: Easy token-based authentication with environment variable support
- **🔒 Secrets Management**: Securely handle sensitive data and credentials in your workflows
- **🐍 Python Client**: Programmatic access to Datalayer platform with context managers and clean resource management
- **🌐 TypeScript/React Client**: React components and services for building Jupyter-based applications
- **💻 Command Line Interface**: CLI tools for account and platform operations
- **🔧 Base Classes**: Core application classes and configuration inherited by other Datalayer projects
- **📓 Jupyter Integration**: ServiceManager and collaboration providers for notebook experiences
- **🧭 Universal Navigation**: Smart navigation hooks that auto-detect and work with React Router, Next.js, or native browser

## Installation

### Python Client

Install Datalayer Core using pip:

```bash
pip install datalayer-core
```

### TypeScript/React Client

Install as an npm package:

```bash
npm install @datalayer/core
```

### Development Installation

```bash
git clone https://github.com/datalayer/core.git
cd core

# Python development
pip install -e .[test]

# TypeScript development
npm install
```

## Quick Start with Python

Set your Datalayer token as an environment variable:

```bash
export DATALAYER_API_KEY="your-api-key"
```

Or pass it directly to the Client:

```python
from datalayer_core import DatalayerClient

# Using environment variable
client = DatalayerClient()

# Or pass token directly
client = DatalayerClient(api_key="your-api-key-here")

if client.authenticate():
    print("Successfully authenticated!")
```

## Architecture

Datalayer Core serves as the foundation for the entire Datalayer ecosystem:

- **Base Classes**: Core application classes inherited by other Datalayer packages
- **Configuration Management**: Centralized configuration system for all Datalayer components
- **Authentication Layer**: Unified authentication across all Datalayer services
- **Runtime Abstraction**: Common interface for different types of compute runtimes
- **Resource Management**: Automatic cleanup and lifecycle management

## Examples

- [OTEL example README](./examples/otel/README.md)

## Documentation

- **Command Line Interface (CLI)**: [https://datalayer.ai/docs/cli/](https://datalayer.ai/docs/cli/)
- **Core Python Client**: [core.datalayer.tech/python/](https://core.datalayer.tech/python/)
- **Platform Documentation**: [docs.datalayer.app](https://datalayer.ai/docs/)
- **API Reference**: [API documentation](https://datalayer.ai/docs/api/)

## Development

### Building the Library

```bash
# Build TypeScript library
npm run build:lib

# Build Python package
python -m build
```

### Setup

```bash
# Install Python dependencies
pip install -e .[test]

# Install TypeScript dependencies
npm install
```

### Code Quality

This project maintains high code quality standards with automated linting, formatting, and type checking:

```bash
# Run all checks (format, lint, type-check)
npm run check

# Auto-fix all issues
npm run check:fix

# Individual commands
npm run lint          # ESLint with React/TypeScript rules
npm run lint:fix      # Auto-fix linting issues
npm run format        # Prettier formatting
npm run format:check  # Check formatting without changes
npm run type-check    # TypeScript compilation check
```

Pre-commit hooks automatically run formatting and linting on staged files via Husky and lint-staged.

### Running Tests

```bash
# Python tests
pip install -e .[test]
pytest datalayer_core/tests/

# TypeScript tests
npm run test

# TypeScript type checking
npm run type-check
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Contributing

This Client is designed to be simple and extensible. We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

For issues and enhancement requests, please use the [GitHub issue tracker](https://github.com/datalayer/core/issues).

## Use Cases

- **AI/ML Development**: Scale your machine learning workflows with cloud compute using Client or CLI
- **Data Analysis**: Process large datasets with powerful remote runtimes
- **Research**: Collaborate on computational research with reproducible environments
- **Automation**: Integrate Datalayer into CI/CD pipelines and automated workflows using CLI tools
- **Prototyping**: Quickly test ideas without local hardware limitations

## License

This project is licensed under the [BSD 3-Clause License](https://github.com/datalayer/core/blob/main/LICENSE).

## Support

- **Documentation**: [Datalayer Platform Documentation](https://datalayer.ai/docs/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.ai)

---

<div align="center">

**If this project is helpful to you, please give us a ⭐️**

Made with ❤️ by [Datalayer](https://datalayer.ai)

<img src="https://assets.datalayer.tech/datalayer-25.svg" alt="Datalayer Logo" width="200"></img>

</div>
