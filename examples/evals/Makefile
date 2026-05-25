SHELL := /bin/bash

.DEFAULT_GOAL := help

LOCAL_IAM_URL ?= http://localhost:9700/api/iam/
LOCAL_RUNTIMES_URL ?= http://localhost:9500/api/runtimes/
LOCAL_AI_AGENTS_URL ?= http://localhost:4400/api/ai-agents/
LOCAL_AGENT_BASE_URL ?= http://localhost:8765
LOCAL_AGENT_ID ?= default
LOCAL_AGENT_LOG_LEVEL ?= info
LOCAL_AGENT_EVALS_MODE ?= interactive
LOCAL_AGENT_EVALS_EMIT_LIVE_EVENTS ?= true
EVAL_WATCH_TIMEOUT ?= 60
EVAL_WATCH_INTERVAL ?= 2
CLOUD_CREDITS_LIMIT ?= 100
SYNTHETIC ?= 0
SYNTHETIC_FLAG := $(if $(filter 1 true yes on,$(SYNTHETIC)),--synthetic,)

.PHONY: help evals-batch-sdk-local evals-batch-sdk-cloud evals-batch-sdk-proxy-local evals-batch-sdk-proxy-cloud evals-batch-sdk-proxy-synthetic evals-interactive-sdk-local evals-interactive-sdk-cloud evals-interactive-sdk-proxy-local evals-interactive-sdk-proxy-cloud evals-interactive-sdk-proxy-synthetic

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z_-]+:.*?##/ {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

evals-batch-sdk-local: ## Run batch example in SDK lane using direct endpoints with local agent target
	@python evals_batch_example.py --run-environment sdk --run-status completed --execution-target local --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --auto-start-local-agent-runtime --local-agent-log-level $(LOCAL_AGENT_LOG_LEVEL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-batch-sdk-cloud: ## Run batch example in SDK lane using direct endpoints with cloud agent target (set SYNTHETIC=1 for synthetic mode)
	@python evals_batch_example.py --run-environment sdk --run-status completed --execution-target cloud --cloud-credits-limit $(CLOUD_CREDITS_LIMIT) --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-batch-sdk-proxy-local: ## Run batch example via local proxy endpoints in SDK lane with local agent target
	@DATALAYER_EVALS_MODE=$(LOCAL_AGENT_EVALS_MODE) DATALAYER_EVALS_EMIT_LIVE_EVENTS=$(LOCAL_AGENT_EVALS_EMIT_LIVE_EVENTS) python evals_batch_example.py --run-environment sdk-proxy --run-status completed --execution-target local --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --auto-start-local-agent-runtime --local-agent-log-level $(LOCAL_AGENT_LOG_LEVEL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-batch-sdk-proxy-cloud: ## Run batch example via local proxy endpoints in SDK lane with cloud target
	@python evals_batch_example.py --run-environment sdk-proxy --run-status completed --execution-target cloud --cloud-credits-limit $(CLOUD_CREDITS_LIMIT) --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-batch-sdk-proxy-synthetic: ## Run batch example via local proxy endpoints in SDK lane with synthetic (no-agent) behavior
	@python evals_batch_example.py --run-environment sdk-proxy --run-status completed --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --synthetic

evals-interactive-sdk-local: ## Run interactive example in SDK lane using direct endpoints with local agent target
	@python evals_interactive_example.py --run-environment sdk --run-status running --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --execution-target local --auto-start-local-agent-runtime --local-agent-log-level $(LOCAL_AGENT_LOG_LEVEL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-interactive-sdk-cloud: ## Run interactive example in SDK lane using direct endpoints with cloud agent target (set SYNTHETIC=1 for synthetic mode)
	@python evals_interactive_example.py --run-environment sdk --run-status running --execution-target cloud --cloud-credits-limit $(CLOUD_CREDITS_LIMIT) --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-interactive-sdk-proxy-local: ## Run interactive example via local proxy endpoints in SDK lane with local agent target
	@DATALAYER_EVALS_MODE=$(LOCAL_AGENT_EVALS_MODE) DATALAYER_EVALS_EMIT_LIVE_EVENTS=$(LOCAL_AGENT_EVALS_EMIT_LIVE_EVENTS) python evals_interactive_example.py --run-environment sdk-proxy --run-status running --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --execution-target local --auto-start-local-agent-runtime --local-agent-log-level $(LOCAL_AGENT_LOG_LEVEL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-interactive-sdk-proxy-cloud: ## Run interactive example via local proxy endpoints in SDK lane with cloud target
	@python evals_interactive_example.py --run-environment sdk-proxy --run-status running --execution-target cloud --cloud-credits-limit $(CLOUD_CREDITS_LIMIT) --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --local-agent-base-url $(LOCAL_AGENT_BASE_URL) --local-agent-id $(LOCAL_AGENT_ID) $(SYNTHETIC_FLAG)

evals-interactive-sdk-proxy-synthetic: ## Run interactive example via local proxy endpoints in SDK lane with synthetic (no-agent) behavior
	@python evals_interactive_example.py --run-environment sdk-proxy --run-status completed --timeout $(EVAL_WATCH_TIMEOUT) --interval $(EVAL_WATCH_INTERVAL) --synthetic

