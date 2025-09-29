[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Streamlit + Datalayer SDK Example

This example demonstrates how to integrate the Datalayer SDK with a [Streamlit](https://streamlit.io/) application to serve machine learning models using Runtime snapshots.

## Overview

This example showcases:

- **Streamlit Integration**: A faster way to build and share data apps
- **Datalayer SDK**: Integration with Datalayer's client.
- **Snapshot Loading**: Loading and serving pre-trained models from Runtime snapshots.
- **Scikit-learn Models**: Example implementation using sklearn models
- **Web UI**: Use the streamlit application UI to get results

## Features

- ✅ Train ML model on a Datalayer Runtime.
- ✅ Save a Runtime Snapshot for future model prediction.
- ✅ Load ML models from Datalayer snapshots.
- ✅ Create a Streamlit Web UI to use your app.
- ✅ Type hints and Pydantic models for validation.

## Prerequisites

- Python 3.9+
- Datalayer SDK
- Scikit-learn
- Streamlit

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/datalayer/core.git
   cd core/examples/streamlit-sklearn
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Quick Start

1. **Run the model training and create a snapshot**:

   ```bash
   python app/scripts/snapshot.py
   ```

2. **Run the local streamlit application**:

   ```bash
   streamlit run app/main.py
   ```

## Web UI

Access the localhost and test the app!

![streamlit](https://raw.githubusercontent.com/datalayer/core/refs/heads/main/docs/static/img/streamlit.gif)

## Project Structure

```
streamlit-sklearn/
├── requirements.txt      # Python dependencies
├── README.md             # This file
└── app/
    ├── main.py           # Streamlit application
    ├── models.py         # Pydantic model definition
    └── scripts/
        ├── predict.py    # Model prediction logic
        ├── train.py      # Model training logic
        └── snapshot.py   # Model traning and snapshot creation
```

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

- **Documentation**: [Datalayer Platform Documentation](https://docs.datalayer.app/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.app/)

---

<p align="center">
  <strong>🚀 AI Platform for Data Analysis</strong><br></br>
  <a href="https://datalayer.app/">Get started with Datalayer today!</a>
</p>
