#!/usr/bin/env bash

# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

export DATALAYER_CORE_VERSION=1.0.27

CONDA_CHANNEL_NAME=datalayer

ORGANIZATION=datalayer

# Make sure the script stops on any error (errors are otherwise hard to spot)
set -o errtrace -o nounset -o pipefail -o errexit

rm -fr ./out

PKG_PATH=$(conda-build --output-folder ./out . --user $ORGANIZATION -c defaults -c $CONDA_CHANNEL_NAME)

echo $PKG_PATH generated

# Upload the package to a conda organization.
anaconda upload --user $ORGANIZATION $PKG_PATH
