SHELL := /bin/bash

.DEFAULT_GOAL := help

CLI ?= datalayer
EVAL_NAME ?= cli-eval-$(shell date +%Y%m%d)
EXPERIMENT_NAME ?= cli-eval-experiment-$(shell date +%H%M%S)
STATUS ?= queued
WINDOW ?= 24h
LOCAL_IAM_URL ?= http://localhost:9700/api/iam/
LOCAL_RUNTIMES_URL ?= http://localhost:9500/api/runtimes/
LOCAL_AI_AGENTS_URL ?= http://localhost:4400/api/ai-agents/
LOCAL_AI_AGENTS_BASE_URL ?= $(shell printf '%s' "$(LOCAL_AI_AGENTS_URL)" | sed -E 's#/api/ai-agents/?$$##')

ENV_FILE := .evals.env

-include $(ENV_FILE)

define run_cli
	$(CLI) evals $(1) \
	$${DATALAYER_API_KEY:+--token $$DATALAYER_API_KEY} \
	$${DATALAYER_AI_AGENTS_URL:+--ai-agents-url $$DATALAYER_AI_AGENTS_URL} \
	$${DATALAYER_ACCOUNT_UID:+--account-uid $$DATALAYER_ACCOUNT_UID}
endef

.PHONY: help list-evals create-eval create-experiment launch-run watch-run list-runs live-targets list-evals-local create-eval-local create-experiment-local launch-run-local watch-run-local list-runs-local live-targets-local python-quickstart-hosted python-quickstart-sdk python-feature-tour-hosted python-feature-tour-sdk python-quickstart-hosted-local python-quickstart-sdk-local python-feature-tour-hosted-local python-feature-tour-sdk-local python-quickstart python-feature-tour python-quickstart-local python-feature-tour-local clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z_-]+:.*?##/ {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

list-evals: ## List evals
	@$(call run_cli,evals list --limit 20)

create-eval: ## Create a hosted eval and persist EVAL_ID to .evals.env
	@out="$$( $(call run_cli,evals create "$(EVAL_NAME)" --description "Eval created from core/examples/evals") )"; \
	echo "$$out"; \
	eval_id="$$(echo "$$out" | grep -Eo '[0-9a-f]{8}-[0-9a-f-]{27,}' | head -n1)"; \
	if [[ -z "$$eval_id" ]]; then echo "Could not extract EVAL_ID"; exit 1; fi; \
	grep -v '^EVAL_ID=' $(ENV_FILE) 2>/dev/null > $(ENV_FILE).tmp || true; \
	echo "EVAL_ID=$$eval_id" >> $(ENV_FILE).tmp; \
	mv $(ENV_FILE).tmp $(ENV_FILE); \
	echo "Saved EVAL_ID=$$eval_id to $(ENV_FILE)"

create-experiment: ## Create experiment from EVAL_ID and persist EXPERIMENT_ID
	@if [[ -z "$(EVAL_ID)" ]]; then echo "EVAL_ID missing. Run: make create-eval"; exit 1; fi
	@out="$$( $(call run_cli,experiments create "$(EXPERIMENT_NAME)" --eval-id "$(EVAL_ID)") )"; \
	echo "$$out"; \
	experiment_id="$$(echo "$$out" | grep -Eo '[0-9a-f]{8}-[0-9a-f-]{27,}' | head -n1)"; \
	if [[ -z "$$experiment_id" ]]; then echo "Could not extract EXPERIMENT_ID"; exit 1; fi; \
	grep -v '^EXPERIMENT_ID=' $(ENV_FILE) 2>/dev/null > $(ENV_FILE).tmp || true; \
	echo "EXPERIMENT_ID=$$experiment_id" >> $(ENV_FILE).tmp; \
	mv $(ENV_FILE).tmp $(ENV_FILE); \
	echo "Saved EXPERIMENT_ID=$$experiment_id to $(ENV_FILE)"

launch-run: ## Launch run from EXPERIMENT_ID and persist RUN_ID
	@if [[ -z "$(EXPERIMENT_ID)" ]]; then echo "EXPERIMENT_ID missing. Run: make create-experiment"; exit 1; fi
	@out="$$( $(call run_cli,runs launch --experiment-id "$(EXPERIMENT_ID)" --status "$(STATUS)" --summary-json '{"note":"launched from examples Makefile"}') )"; \
	echo "$$out"; \
	run_id="$$(echo "$$out" | grep -Eo '[0-9a-f]{8}-[0-9a-f-]{27,}' | head -n1)"; \
	if [[ -z "$$run_id" ]]; then echo "Could not extract RUN_ID"; exit 1; fi; \
	grep -v '^RUN_ID=' $(ENV_FILE) 2>/dev/null > $(ENV_FILE).tmp || true; \
	echo "RUN_ID=$$run_id" >> $(ENV_FILE).tmp; \
	mv $(ENV_FILE).tmp $(ENV_FILE); \
	echo "Saved RUN_ID=$$run_id to $(ENV_FILE)"

watch-run: ## Watch RUN_ID to completion/failure
	@if [[ -z "$(RUN_ID)" ]]; then echo "RUN_ID missing. Run: make launch-run"; exit 1; fi
	@$(call run_cli,runs watch "$(RUN_ID)" --timeout 600 --interval 3)

list-runs: ## List runs for EXPERIMENT_ID
	@if [[ -z "$(EXPERIMENT_ID)" ]]; then echo "EXPERIMENT_ID missing. Run: make create-experiment"; exit 1; fi
	@$(call run_cli,runs list --experiment-id "$(EXPERIMENT_ID)" --limit 20)

live-targets: ## List live monitoring targets
	@$(call run_cli,live targets --window "$(WINDOW)" --limit 20)

list-evals-local: ## Local equivalent of list-evals (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) list-evals

create-eval-local: ## Local equivalent of create-eval (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) create-eval

create-experiment-local: ## Local equivalent of create-experiment (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) create-experiment

launch-run-local: ## Local equivalent of launch-run (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) launch-run

watch-run-local: ## Local equivalent of watch-run (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) watch-run

list-runs-local: ## Local equivalent of list-runs (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) list-runs

live-targets-local: ## Local equivalent of live-targets (uses LOCAL_AI_AGENTS_URL)
	@DATALAYER_AI_AGENTS_URL="$(LOCAL_AI_AGENTS_BASE_URL)" $(MAKE) live-targets

python-quickstart-hosted: ## Quickstart with source=hosted (shows in Hosted tab)
	@python launch_and_monitor.py --eval-source hosted --execution-mode sdk --run-status completed --timeout 60 --interval 2

python-quickstart-sdk: ## Quickstart with source=local + execution_mode=sdk (shows in SDK tab)
	@python launch_and_monitor.py --eval-source local --execution-mode sdk --run-status completed --timeout 60 --interval 2

python-feature-tour-hosted: ## Feature tour with source=hosted (shows in Hosted tab)
	@python feature_tour.py --eval-source hosted --runs-per-experiment 5 --compare-limit 2 --status completed --execution-mode sdk

python-feature-tour-sdk: ## Feature tour with source=local + execution_mode=sdk (shows in SDK tab)
	@python feature_tour.py --eval-source local --runs-per-experiment 5 --compare-limit 2 --status completed --execution-mode sdk

python-quickstart-hosted-local: ## Local quickstart hosted source
	@python launch_and_monitor.py \
		--eval-source hosted \
		--execution-mode sdk \
		--run-status completed \
		--timeout 60 \
		--interval 2 \
		--iam-url "$(LOCAL_IAM_URL)" \
		--runtimes-url "$(LOCAL_RUNTIMES_URL)" \
		--ai-agents-url "$(LOCAL_AI_AGENTS_URL)"

python-quickstart-sdk-local: ## Local quickstart SDK source
	@python launch_and_monitor.py \
		--eval-source local \
		--execution-mode sdk \
		--run-status completed \
		--timeout 60 \
		--interval 2 \
		--iam-url "$(LOCAL_IAM_URL)" \
		--runtimes-url "$(LOCAL_RUNTIMES_URL)" \
		--ai-agents-url "$(LOCAL_AI_AGENTS_URL)"

python-feature-tour-hosted-local: ## Local feature tour hosted source
	@python feature_tour.py \
		--eval-source hosted \
		--runs-per-experiment 5 \
		--compare-limit 2 \
		--status completed \
		--execution-mode sdk \
		--iam-url "$(LOCAL_IAM_URL)" \
		--runtimes-url "$(LOCAL_RUNTIMES_URL)" \
		--ai-agents-url "$(LOCAL_AI_AGENTS_URL)"

python-feature-tour-sdk-local: ## Local feature tour SDK source
	@python feature_tour.py \
		--eval-source local \
		--runs-per-experiment 5 \
		--compare-limit 2 \
		--status completed \
		--execution-mode sdk \
		--iam-url "$(LOCAL_IAM_URL)" \
		--runtimes-url "$(LOCAL_RUNTIMES_URL)" \
		--ai-agents-url "$(LOCAL_AI_AGENTS_URL)"

# Compatibility aliases
python-quickstart: ## Alias of python-quickstart-sdk
	@$(MAKE) python-quickstart-sdk

python-feature-tour: ## Alias of python-feature-tour-sdk
	@$(MAKE) python-feature-tour-sdk

python-quickstart-local: ## Alias of python-quickstart-sdk-local
	@$(MAKE) python-quickstart-sdk-local

python-feature-tour-local: ## Alias of python-feature-tour-sdk-local
	@$(MAKE) python-feature-tour-sdk-local

clean: ## Remove generated environment state
	rm -f $(ENV_FILE)
