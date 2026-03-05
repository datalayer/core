[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Datalayer Client Examples

This directory contains practical examples demonstrating how to use the Datalayer Client and core functionality in various scenarios and frameworks.

## 📋 Available Examples

## 🎯 Client Fundamentals

### 🎭 [Datalayer Decorator](./decorator/README.md)

Comprehensive examples demonstrating the `@datalayer` decorator for seamless remote function execution.

- **Use Case**: Transform regular functions into distributed computations
- **Technologies**: Datalayer Client decorators, remote runtime execution
- **Features**: Function decoration, input/output mapping, snapshot integration, multiple environments

## 🖥️ Desktop Applications

### ⚡ [Datalayer Desktop App](https://github.com/datalayer/desktop)

A native desktop application showcasing the Datalayer frontend Client with Jupyter notebook integration.

- **Use Case**: Desktop-based data science environment with cloud compute
- **Technologies**: Electron, React, TypeScript, Datalayer Client
- **Features**: Jupyter notebooks, runtime management, environment selection, real-time collaboration
- **Repository**: https://github.com/datalayer/desktop

## 🚀 Web Frameworks & APIs

### 🚀 [FastAPI + Scikit-learn](./fastapi/README.md)

A REST API server that serves machine learning models using FastAPI and Datalayer Client.

- **Use Case**: Production ML model deployment with REST API
- **Technologies**: FastAPI, Scikit-learn, Uvicorn
- **Features**: Model serving, snapshot loading, automatic API documentation

### 📊 [Streamlit + Scikit-learn](./streamlit/README.md)

An interactive web application for machine learning model inference using Streamlit.

- **Use Case**: Interactive ML model demonstration and testing
- **Technologies**: Streamlit, Scikit-learn
- **Features**: Web UI, model training, snapshot management, real-time predictions

## 📓 Interactive Notebooks

### ⚛️ [Next.js + Datalayer Notebook](./nextjj/README.md)

A modern Next.js application integrating Jupyter notebooks with Datalayer's cloud platform for interactive data science workflows.

- **Use Case**: Web-based notebook interfaces with cloud runtime execution
- **Technologies**: Next.js 14, TypeScript, @datalayer/jupyter-react, Zustand
- **Features**:
  - Token authentication with Datalayer IAM
  - Browse and create notebooks from workspace
  - Select compute environments for execution
  - Interactive notebook viewer with real-time outputs
  - Clean, responsive UI with GitHub Primer components
  - Centered empty states with proper spacing

## 🔥 High-Performance Computing

### ⚡ [PyTorch GPU Workloads](./pytorch/README.md)

GPU-accelerated PyTorch benchmarks demonstrating significant performance improvements over CPU execution across multiple computation types.

- **Use Case**: Heavy computational workloads and GPU acceleration
- **Technologies**: PyTorch, CUDA, GPU computing
- **Features**: Dual benchmarks (matrix multiplication + convolutions), CPU vs GPU performance comparison.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

- **Documentation**: [Datalayer Platform Documentation](https://docs.datalayer.app/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.app/)

---

<p align="center">
  <strong>🚀 AI Agents for Data Analysis</strong><br></br>
  <a href="https://datalayer.app/">Get started with Datalayer today!</a>
</p>
