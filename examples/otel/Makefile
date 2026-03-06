# Copyright (c) 2023-2025 Datalayer, Inc.
#
# Datalayer License

SHELL=/bin/bash

.DEFAULT_GOAL := default

.PHONY: help default all install install-ui dev start start-server start-ui \
        proxy smoke-test logfire traces metrics logs query stats services flush clean

default: all ## Default target is all.

help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

all: install install-ui ## Install Python and JS dependencies.

##@ Setup

install: ## Install Python dependencies.
	pip install -r requirements.txt

install-ui: ## Install React UI dependencies.
	cd ui && npm install

##@ Run

start: ## Start both the FastAPI server and React UI (single target).
	@echo
	@echo "Starting FastAPI server on http://localhost:8600"
	@echo "Starting React UI      on http://localhost:5173"
	@echo
	@trap 'kill 0' EXIT; \
	  uvicorn app.main:app --reload --port 8600 & \
	  (sleep 2 && cd ui && npm run dev) & \
	  wait

start-server: ## Start the FastAPI server only.
	@echo
	@echo "open http://localhost:8600"
	@echo "open http://localhost:8600/docs"
	@echo
	uvicorn app.main:app --reload --port 8600

start-ui: ## Start the React UI only (expects server on :8600).
	cd ui && npm run dev

##@ OTEL Service

proxy: ## Port-forward the OTEL service (Collector + FastAPI).
	plane pf-otel

smoke-test: ## Run an end-to-end smoke test against the OTEL service.
	datalayer otel smoke-test \
	  --url http://localhost:7800 \
	  --otlp-endpoint http://localhost:4318

logfire: ## Run the logfire + pydantic_ai example against the Datalayer OTEL service.
	python -m app.example

##@ Query (via datalayer core CLI)

traces: ## List recent traces.
	datalayer otel traces

metrics: ## Query metrics.
	datalayer otel metrics

logs: ## Query logs.
	datalayer otel logs

query: ## Run ad-hoc SQL (usage: make query SQL="SELECT * FROM spans LIMIT 10").
	datalayer otel query "$(SQL)"

stats: ## Show storage statistics.
	datalayer otel stats

services: ## List observed service names.
	datalayer otel services

flush: ## Force-flush buffered data.
	datalayer otel flush

##@ Maintenance

clean: ## Remove generated files.
	rm -rf ui/node_modules ui/dist __pycache__ app/__pycache__ .pytest_cache
