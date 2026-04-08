# Datalayer OTEL Example

This example demonstrates the **full OTEL observability stack** using:

- A **FastAPI Python server** that:
  - Generates sample traces / logs / metrics via OpenTelemetry SDK
  - Proxies read queries to the Datalayer OTEL backend using `datalayer_core.otel.OtelClient`
- A **React TypeScript UI** that:
  - Sends requests to generate signals via the local FastAPI server
  - Visualises traces, logs, and metrics using `@datalayer/core` OTEL React components

## Prerequisites

- A running Datalayer OTEL backend (default `http://localhost:7800`)
- Python ≥ 3.11
- Node.js ≥ 18

## Quick start

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
export DATALAYER_OTEL_URL=http://localhost:7800   # OTEL backend
export DATALAYER_API_KEY=<your-jwt-token>          # optional
```

### 3. Start the FastAPI server

```bash
uvicorn app.main:app --reload --port 8600
```

### 4. Start the React UI (in a second terminal)

```bash
cd ui
npm install
npm run dev
```

The UI will be served at <http://localhost:5173> and proxies `/api` calls
to the FastAPI server on port 8600.

## Endpoints (FastAPI)

| Method | Path                                | Description                          |
| ------ | ----------------------------------- | ------------------------------------ |
| GET    | `/`                                 | Welcome page                         |
| POST   | `/api/generate/traces`              | Generate sample traces               |
| POST   | `/api/generate/logs`                | Generate sample log records          |
| POST   | `/api/generate/metrics`             | Generate sample metric data points   |
| GET    | `/api/otel/v1/traces`               | Proxy to OTEL backend – list traces  |
| GET    | `/api/otel/v1/traces/{id}`          | Proxy to OTEL backend – trace spans  |
| GET    | `/api/otel/v1/logs`                 | Proxy to OTEL backend – list logs    |
| GET    | `/api/otel/v1/metrics`              | Proxy to OTEL backend – list metrics |
| GET    | `/api/otel/v1/traces/services/list` | Proxy – list services                |
| GET    | `/api/otel/v1/stats`                | Proxy – storage statistics           |
