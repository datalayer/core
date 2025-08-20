**Datalayer Core**

---

[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Ξ Datalayer Core

<p align="center">
  <img src="https://assets.datalayer.tech/datalayer-25.svg" alt="Datalayer Logo" width="200"></img>
</p>

<p align="center">
  <strong>The foundational Python SDK for the Datalayer AI Platform</strong>
</p>

<p align="center">
  <a href="https://pypi.org/project/datalayer-core/"><img src="https://img.shields.io/pypi/v/datalayer-core.svg" alt="PyPI version"></img></a>
  <a href="https://pypi.org/project/datalayer-core/"><img src="https://img.shields.io/pypi/pyversions/datalayer-core.svg" alt="Python versions"></img></a>
  <a href="https://github.com/datalayer/core/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-BSD%203--Clause-blue.svg" alt="License"></img></a>
  <a href="https://docs.datalayer.app/"><img src="https://img.shields.io/badge/docs-datalayer.app-blue" alt="Documentation"></img></a>
  <a href="https://github.com/datalayer/core/actions/workflows/tests.yml"><img src="https://github.com/datalayer/core/actions/workflows/tests.yml/badge.svg" alt="Units Tests"></img></a>
</p>

## Overview

Datalayer Core is the foundational package that powers the [Datalayer AI Platform](https://datalayer.app/). It provides both a Python SDK and Command Line Interface (CLI) for AI engineers, data scientists, and researchers to seamlessly integrate scalable compute runtimes into their workflows.

This package serves as the base foundation used by many other Datalayer packages, containing core application classes, configuration, and unified APIs for authentication, runtime management, and code execution in cloud-based environments.

## Key Features

- **🔐 Simple Authentication**: Easy token-based authentication with environment variable support
- **⚡ Runtime Management**: Create and manage scalable compute runtimes (CPU/GPU) for code execution
- **📸 Snapshot Management**: Create and manage compute snapshots of your runtimes for reproducible environments
- **🔒 Secrets Management**: Securely handle sensitive data and credentials in your workflows
- **🐍 Python SDK**: Programmatic access to Datalayer platform with context managers and clean resource management
- **🌐 TypeScript/React SDK**: React components and services for building Jupyter-based applications
- **💻 Command Line Interface**: CLI tools for managing runtimes, snapshots, and platform resources
- **🔧 Base Classes**: Core application classes and configuration inherited by other Datalayer projects
- **📓 Jupyter Integration**: ServiceManager and collaboration providers for notebook experiences

## Installation

### Python SDK

Install Datalayer Core using pip:

```bash
pip install datalayer-core
```

### TypeScript/React SDK

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

### 1. Authentication

Set your Datalayer token as an environment variable:

```bash
export DATALAYER_TOKEN="your-token-here"
```

Or pass it directly to the SDK:

```python
from datalayer_core import DatalayerClient

# Using environment variable
client = DatalayerClient()

# Or pass token directly
client = DatalayerClient(token="your-token-here")

if client.authenticate():
    print("Successfully authenticated!")
```

### 2. Execute Code in a Runtime

Use context managers to create runtimes and ensure proper resource cleanup:

```python
from datalayer_core import DatalayerClient

client = DatalayerClient()

# Execute code in a managed runtime
with client.create_runtime() as runtime:
    response = runtime.execute("print('Hello from Datalayer!')")
    print(response.stdout)
```

### 3. Using the CLI

The CLI provides command-line access to Datalayer platform features:

```bash
# List available runtimes
datalayer runtime list

# Create a new runtime
datalayer runtime create ai-env --given-name my-runtime-123

# Execute a script in a runtime
datalayer runtime exec my-script.py --runtime <runtime-id>

# Create a snapshot from a runtime but do not terminate the runtime
datalayer snapshots create <pod-name> my-snapshot 'AI work!' False
```

## Examples

### Python Examples

For comprehensive Python usage examples, see the [`examples/`](https://github.com/datalayer/core/tree/main/examples) directory which includes:

- **FastAPI + scikit-learn**: Web application with ML models
- **Streamlit + scikit-learn**: Interactive data science apps
- **PyTorch GPU workloads**: High-performance computing examples
- **Decorator patterns**: Remote function execution with `@datalayer`
- **And more**: Complete examples with documentation and setup instructions

### TypeScript/React Examples

Run the interactive examples locally:

```bash
# Install dependencies
npm install

# Set your Datalayer API token in .env
echo "VITE_DATALAYER_API_TOKEN=your-token-here" > .env

# Start the examples server
npm run example
```

Available at http://localhost:3000/:

- **DatalayerNotebookExample**: Full integration with Datalayer services and collaboration
- **NotebookExample**: Basic Jupyter notebook in React
- **CellExample**: Individual code cell execution

## Platform Integration

Datalayer adds AI capabilities and scalable compute runtimes to your development workflows. The platform is designed to seamlessly integrate into your existing processes and supercharge your computations with the processing power you need.

Key platform features accessible through this SDK and CLI:

- **Remote Runtimes**: Execute code on powerful remote machines with CPU, RAM, and GPU resources
- **Multiple Interfaces**: Access and consume runtimes through Python SDK, CLI, or other integrated tools
- **Scalable Compute**: Dynamically scale your computational resources based on workload requirements

## Documentation

- **Command Line Interface (CLI)**: [https://docs.datalayer.app/cli/](https://docs.datalayer.app/cli/)
- **Core Python SDK**: [core.datalayer.tech/python/](https://core.datalayer.tech/python/)
- **Platform Documentation**: [docs.datalayer.app](https://docs.datalayer.app/)
- **API Reference**: [API documentation](https://docs.datalayer.app/api/)

## Development

### Building the Library

```bash
# Build TypeScript library
npm run build:lib

# Build Python package
python -m build
```

### Running Tests

```bash
# Python tests
pip install -e .[test]
pytest datalayer_core/tests/

# TypeScript tests
npm run test

# TypeScript type checking
npm run type-check
```

### Contributing

This SDK is designed to be simple and extensible. We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

For issues and enhancement requests, please use the [GitHub issue tracker](https://github.com/datalayer/core/issues).

## Architecture

Datalayer Core serves as the foundation for the entire Datalayer ecosystem:

- **Base Classes**: Core application classes inherited by other Datalayer packages
- **Configuration Management**: Centralized configuration system for all Datalayer components
- **Authentication Layer**: Unified authentication across all Datalayer services
- **Runtime Abstraction**: Common interface for different types of compute runtimes
- **Resource Management**: Automatic cleanup and lifecycle management

## Use Cases

- **AI/ML Development**: Scale your machine learning workflows with cloud compute using SDK or CLI
- **Data Analysis**: Process large datasets with powerful remote runtimes
- **Research**: Collaborate on computational research with reproducible environments
- **Automation**: Integrate Datalayer into CI/CD pipelines and automated workflows using CLI tools
- **Prototyping**: Quickly test ideas without local hardware limitations

## License

This project is licensed under the [BSD 3-Clause License](https://github.com/datalayer/core/blob/main/LICENSE).

## Support

- **Documentation**: [Datalayer Platform Documentation](https://docs.datalayer.app/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.app/)

---

<p align="center">
  <strong>🚀 AI Platform for Data Analysis</strong><br></br>
  <a href="https://datalayer.app/">Get started with Datalayer today!</a>
</p>
