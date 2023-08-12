# Copyright (c) Datalayer, Inc. https://datalayer.io
# Distributed under the terms of the MIT License.

SHELL=/bin/bash

CONDA=source $$(conda info --base)/etc/profile.d/conda.sh
CONDA_ACTIVATE=source $$(conda info --base)/etc/profile.d/conda.sh ; conda activate
CONDA_DEACTIVATE=source $$(conda info --base)/etc/profile.d/conda.sh ; conda deactivate
CONDA_REMOVE=source $$(conda info --base)/etc/profile.d/conda.sh ; conda remove -y --all -n

ENV_NAME=datalayer

.DEFAULT_GOAL := default

.SILENT: init

.PHONY: port-forward storybook

help: ## display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

default: help ## default target is help

clean: ui-clean services-clean ## clean

install: ui-install services-install ## install

build: ui-build services-build ## build

backend: services-clean services-build services-install ## api

services-clean: ## services-clean
	find . -name *.egg-info | xargs rm -fr {} || true
	find . -name __pycache__ | xargs rm -fr {} || true
	find . -name dist | xargs rm -fr {} || true

services-install: ## services-install
	($(CONDA_ACTIVATE) ${ENV_NAME}; \
	  ./../bin/dla env-dev plane )

services-build: ## services-build
	echo Done.

env: warning ## env
	($(CONDA); \
		SLUGIFY_USES_TEXT_UNIDECODE=yes conda env create -n datalayer -f ${DATALAYER_HOME}/src/environment.yml )
	@exec echo "You can now populate the datalayer environment."
	@exec echo "-------------------------------------------------------"
	@exec echo "conda activate datalayer"
	@exec echo "make env-dev"
	@exec echo "-------------------------------------------------------"

define init_ext
	@exec echo
	@exec echo -----------------------
	@exec echo ${DATALAYER_HOME}/src/${2}
	@exec echo
	cd ${DATALAYER_HOME}/src/${2} && \
		git init || true && \
		git checkout -b main || true && \
		git remote add origin https://github.com/datalayer/${1}.git || true && \
		git add -A || true && \
		git commit -am "big bang" || true && \
		git push origin main
endef

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
#	eval $(DOCKER_ENV)

cqlsh: ## port-forward
	($(CONDA_ACTIVATE) datalayer; \
		yarn cqlsh )

pf: port-forward ## alias for port-forward

pf-cassandra: ## pf-solr
	($(CONDA_ACTIVATE) datalayer; \
		yarn port-forward:cassandra )

pf-jupyterpool: ## pf-solr
	($(CONDA_ACTIVATE) datalayer; \
		yarn port-forward:jupyterpool )

pf-redis: ## pf-solr
	($(CONDA_ACTIVATE) datalayer; \
		yarn port-forward:redis )

pf-solr: ## pf-solr
	($(CONDA_ACTIVATE) datalayer; \
		yarn port-forward:solr )

port-forward: ## port-forward
	($(CONDA_ACTIVATE) datalayer; \
		yarn port-forward )

frontend: ui-clean ui-install ui-build ## ui

ui-clean: ## ui-clean
	find . -name node_modules | xargs rm -fr {} || true
	find . -name lib | xargs rm -fr {} || true
	find . -name build | xargs rm -fr {} || true
	find . -name dist | xargs rm -fr {} || true
	find . -name yarn.lock | xargs rm {} || true
	find . -name yarn-error.log | xargs rm {} || true
	find . -name package-lock.json | xargs rm {} || true
	find . -name tsconfig.tsbuildinfo | xargs rm {} || true
	find . -name .docusaurus | xargs rm -fr {} || true

ui-build: ## ui-build
	($(CONDA_ACTIVATE) datalayer; \
		yarn build )

ui-install: ## ui-install
	($(CONDA_ACTIVATE) datalayer; \
		yarn install )
	rm -fr tech/widgets/node_modules/react | true
	rm -fr tech/widgets/node_modules/react-dom | true
	rm -fr run/*/node_modules/react | true
	rm -fr run/*/node_modules/react-dom | true
	rm -fr landing/*/node_modules/react | true
	rm -fr landing/*/node_modules/react-dom | true
	rm node_modules/react-router-dom/index.d.ts | true
	rm -fr node_modules/\@types/react-router-dom | true
	rm -fr node_modules/\@jupyter-widgets/*/node_modules/ | true
#	rm -fr node_modules/\@jupyter-widgets/*/node_modules/\@jupyterlab | true
#	rm -fr node_modules/\@jupyter-widgets/*/node_modules/\@lumino | true
	echo "Copying yjs"
	rm -fr tech/jupyter/react/node_modules/yjs && cp -r node_modules/yjs tech/jupyter/react/node_modules/
	echo "The following is a temporary fix tested on MacOS - For other OS, you may need to fix manually"
	sed -i.bu "s|k: keyof TableOfContents.IConfig|k: string|g" node_modules/\@jupyterlab/notebook/lib/toc.d.ts
	sed -i.bu "s|uri: DocumentUri|uri: string|g" node_modules/vscode-languageserver-protocol/lib/common/protocol.diagnostic.d.ts
	sed -i.bu "s|uri: DocumentUri|uri: string|g" node_modules/vscode-languageserver-types/lib/umd/main.d.ts
	sed -i.bu "s|id: ChangeAnnotationIdentifier|uri: string|g" node_modules/vscode-languageserver-types/lib/umd/main.d.ts
	sed -i.bu "s|\[x: symbol\]: any;||g" node_modules/\@primer/react/lib/Button/LinkButton.d.ts
	sed -i.bu "s|\| system||g" node_modules/\@primer/react/lib/Button/LinkButton.d.ts
	sed -i.bu "s|never|any|g" node_modules/\@primer/react/lib/utils/types/KeyPaths.d.ts
	sed -i.bu "s|src/LexicalTypeaheadMenuPlugin|LexicalTypeaheadMenuPlugin|g" node_modules/\@lexical/react/LexicalAutoEmbedPlugin.d.ts

frontend-ls: ## frontend-ls
	yarn ls

storybook:
	($(CONDA_ACTIVATE) datalayer; \
		yarn storybook )

jupyterpool-sqlite:
	($(CONDA_ACTIVATE) datalayer; \
	  cd ./tech/jupyter/pool/dev/utils && \
	  ./jupyterpool-sqlite.sh )

kill:
	./dev/utils/kill.sh

warning:
	echo "\x1b[34m\x1b[43mEnsure you have run \x1b[1;37m\x1b[41m conda deactivate \x1b[22m\x1b[34m\x1b[43m before invoking this.\x1b[0m"
