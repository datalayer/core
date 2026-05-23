SHELL := /bin/bash

.DEFAULT_GOAL := help

LOCAL_IAM_URL ?= http://localhost:9700/api/iam/
LOCAL_RUNTIMES_URL ?= http://localhost:9500/api/runtimes/
LOCAL_AI_AGENTS_URL ?= http://localhost:4400/api/ai-agents/

.PHONY: help python-batch-cloud python-batch-cloud-proxy python-batch-local-proxy python-batch-local python-interactive-cloud python-interactive-cloud-proxy python-interactive-local-proxy python-interactive-local python-batch-proxy python-interactive-proxy

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z_-]+:.*?##/ {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

python-batch-cloud: ## Run batch example in cloud environment
	@python evals_batch_example.py --run-environment cloud --run-status completed

python-batch-cloud-proxy: ## Run batch example via local proxy endpoints with cloud backend mode
	@python evals_batch_example.py --run-environment cloud-proxy --run-status completed

python-batch-local-proxy: ## Run batch example via local proxy endpoints with local backend mode
	@python evals_batch_example.py --run-environment local-proxy --run-status completed

python-batch-local: ## Run batch example in local backend mode with direct cloud endpoints
	@python evals_batch_example.py --run-environment local --run-status completed

python-interactive-cloud: ## Run interactive example in cloud environment
	@python evals_interactive_example.py --run-environment cloud --run-status running

python-interactive-cloud-proxy: ## Run interactive example via local proxy endpoints with cloud backend mode
	@python evals_interactive_example.py --run-environment cloud-proxy --run-status running

python-interactive-local-proxy: ## Run interactive example via local proxy endpoints with local backend mode
	@python evals_interactive_example.py --run-environment local-proxy --run-status running

python-interactive-local: ## Run interactive example in local backend mode with direct cloud endpoints
	@python evals_interactive_example.py --run-environment local --run-status running

python-batch-proxy: ## Deprecated alias for python-batch-cloud-proxy
	@$(MAKE) python-batch-cloud-proxy

python-interactive-proxy: ## Deprecated alias for python-interactive-cloud-proxy
	@$(MAKE) python-interactive-cloud-proxy
