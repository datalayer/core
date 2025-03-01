# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) Datalayer, Inc. https://datalayer.io
# Distributed under the terms of the MIT License.

SHELL=/bin/bash

CONDA=source $$(conda info --base)/etc/profile.d/conda.sh
CONDA_ACTIVATE=source $$(conda info --base)/etc/profile.d/conda.sh ; conda activate
CONDA_DEACTIVATE=source $$(conda info --base)/etc/profile.d/conda.sh ; conda deactivate
CONDA_REMOVE=source $$(conda info --base)/etc/profile.d/conda.sh ; conda remove -y --all -n

ENV_NAME=datalayer

VERSION=1.1.1

.DEFAULT_GOAL := default

.SILENT: init

.PHONY: port-forward storybook

help: ## display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

default: help ## default target is help

clean: ui-clean services-clean ## clean

install: ui-install services-install ## install

build: ui-build services-build ## build

env-dev: ## env-dev
	($(CONDA_ACTIVATE) ${ENV_NAME}; \
		./../bin/dla env-dev all )

env-rm: warning ## env-rm
	($(CONDA); \
		conda deactivate && \
		conda remove -y --name ${ENV_NAME} --all || true )

env-status: ## env-status
	($(CONDA_ACTIVATE) ${ENV_NAME}; \
		./../bin/dla env-status )

init: ## init
	eval $(DOCKER_ENV)

start:
	./dev/sh/start-jupyter-server.sh

kill:
	./dev/sh/kill.sh

warning:
	echo "\x1b[34m\x1b[43mEnsure you have run \x1b[1;37m\x1b[41m conda deactivate \x1b[22m\x1b[34m\x1b[43m before invoking this.\x1b[0m"

publish-pypi: # publish the pypi package
	git clean -fdx && \
		python -m build
	@exec echo
	@exec echo twine upload ./dist/*-py3-none-any.whl
	@exec echo
	@exec echo https://pypi.org/project/datalayer-core/#history

publish-conda: # publish the conda package
	@exec echo
	cd ./conda-recipe; ./publish-conda.sh
	@exec echo
	@exec echo https://anaconda.org/datalayer/datalayer-core
	@exec echo conda install datalayer::datalayer-core
