SHELL := /bin/bash

.DEFAULT_GOAL := help

CLI ?= datalayer
DATASET_NAME ?= cli-eval-dataset-$(shell date +%Y%m%d)
EXPERIMENT_NAME ?= cli-eval-experiment-$(shell date +%H%M%S)
STATUS ?= queued
WINDOW ?= 24h

ENV_FILE := .evals.env

-include $(ENV_FILE)

define run_cli
	$(CLI) evals $(1) \
	$${DATALAYER_API_KEY:+--token $$DATALAYER_API_KEY} \
	$${DATALAYER_AI_AGENTS_URL:+--ai-agents-url $$DATALAYER_AI_AGENTS_URL} \
	$${DATALAYER_ACCOUNT_UID:+--account-uid $$DATALAYER_ACCOUNT_UID}
endef

.PHONY: help list-datasets create-dataset create-experiment launch-run watch-run list-runs live-targets clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target>\n"} /^[a-zA-Z_-]+:.*?##/ {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

list-datasets: ## List eval datasets
	@$(call run_cli,datasets list --limit 20)

create-dataset: ## Create a hosted eval dataset and persist DATASET_ID to .evals.env
	@out="$$( $(call run_cli,datasets create "$(DATASET_NAME)" --description "Dataset created from core/examples/evals") )"; \
	echo "$$out"; \
	dataset_id="$$(echo "$$out" | grep -Eo '[0-9a-f]{8}-[0-9a-f-]{27,}' | head -n1)"; \
	if [[ -z "$$dataset_id" ]]; then echo "Could not extract DATASET_ID"; exit 1; fi; \
	grep -v '^DATASET_ID=' $(ENV_FILE) 2>/dev/null > $(ENV_FILE).tmp || true; \
	echo "DATASET_ID=$$dataset_id" >> $(ENV_FILE).tmp; \
	mv $(ENV_FILE).tmp $(ENV_FILE); \
	echo "Saved DATASET_ID=$$dataset_id to $(ENV_FILE)"

create-experiment: ## Create experiment from DATASET_ID and persist EXPERIMENT_ID
	@if [[ -z "$(DATASET_ID)" ]]; then echo "DATASET_ID missing. Run: make create-dataset"; exit 1; fi
	@out="$$( $(call run_cli,experiments create "$(EXPERIMENT_NAME)" --dataset-id "$(DATASET_ID)") )"; \
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

clean: ## Remove generated environment state
	rm -f $(ENV_FILE)
