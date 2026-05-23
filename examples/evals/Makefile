SHELL := /bin/bash

.DEFAULT_GOAL := help

LOCAL_IAM_URL ?= http://localhost:9700/api/iam/
LOCAL_RUNTIMES_URL ?= http://localhost:9500/api/runtimes/
LOCAL_AI_AGENTS_URL ?= http://localhost:4400/api/ai-agents/
NO_AGENT ?= 0
NO_AGENT_FLAG := $(if $(filter 1 true yes on,$(NO_AGENT)),--no-agent,)

.PHONY: help evals-batch-sdk evals-batch-sdk-proxy evals-batch-sdk-proxy-no-agent evals-interactive-sdk evals-interactive-sdk-proxy evals-interactive-sdk-proxy-no-agent

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z_-]+:.*?##/ {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

evals-batch-sdk: ## Run batch example in SDK lane using direct endpoints (set NO_AGENT=1 for synthetic mode)
	@python evals_batch_example.py --run-environment sdk --run-status completed $(NO_AGENT_FLAG)

evals-batch-sdk-proxy: ## Run batch example via local proxy endpoints in SDK lane (set NO_AGENT=1 for synthetic mode)
	@python evals_batch_example.py --run-environment sdk-proxy --run-status completed $(NO_AGENT_FLAG)

evals-batch-sdk-proxy-no-agent: ## Run batch example via local proxy endpoints in SDK lane without agent invocation
	@python evals_batch_example.py --run-environment sdk-proxy --run-status completed --no-agent

evals-interactive-sdk: ## Run interactive example in SDK lane using direct endpoints (set NO_AGENT=1 for synthetic mode)
	@python evals_interactive_example.py --run-environment sdk --run-status running $(NO_AGENT_FLAG)

evals-interactive-sdk-proxy: ## Run interactive example via local proxy endpoints in SDK lane (set NO_AGENT=1 for synthetic mode)
	@python evals_interactive_example.py --run-environment sdk-proxy --run-status running $(NO_AGENT_FLAG)

evals-interactive-sdk-proxy-no-agent: ## Run interactive example via local proxy endpoints in SDK lane without agent invocation
	@python evals_interactive_example.py --run-environment sdk-proxy --run-status running --no-agent

