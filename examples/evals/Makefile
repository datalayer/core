SHELL := /bin/bash

.DEFAULT_GOAL := help

LOCAL_IAM_URL ?= http://localhost:9700/api/iam/
LOCAL_RUNTIMES_URL ?= http://localhost:9500/api/runtimes/
LOCAL_AI_AGENTS_URL ?= http://localhost:4400/api/ai-agents/

.PHONY: help evals-batch-sdk evals-batch-sdk-proxy evals-interactive-sdk evals-interactive-sdk-proxy

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z_-]+:.*?##/ {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

evals-batch-sdk: ## Run batch example in SDK lane using direct endpoints
	@python evals_batch_example.py --run-environment sdk --run-status completed

evals-batch-sdk-proxy: ## Run batch example via local proxy endpoints in SDK lane
	@python evals_batch_example.py --run-environment sdk-proxy --run-status completed

evals-interactive-sdk: ## Run interactive example in SDK lane using direct endpoints
	@python evals_interactive_example.py --run-environment sdk --run-status running

evals-interactive-sdk-proxy: ## Run interactive example via local proxy endpoints in SDK lane
	@python evals_interactive_example.py --run-environment sdk-proxy --run-status running

