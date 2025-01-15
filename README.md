[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Ξ Datalayer Core

Datalayer Core is the base foundation package used by many other Datalayer packages. It contains base application classes and configuration inherited by other projects.

It is also the meta package to get the other Datalayer packages installed.

It ships a JupyterLab extension to inspect the JupyterLab's internal strutures like plugin graph, file types, models and widgets.

## Develop

```bash
yarn
yarn build
# open http://localhost:3063
# open http://localhost:8888/api/jupyter/lab?token=60c1661cc408f978c309d04157af55c9588ff9557c9380e4fb50785750703da6
yarn start
```

```bash
pip install -e .[test]
jupyter labextension develop . --overwrite
jupyter labextension list
# jupyter server extension enable datalayer
jupyter server extension list
# open http://localhost:8888/api/jupyter/lab?token=60c1661cc408f978c309d04157af55c9588ff9557c9380e4fb50785750703da6
yarn jupyterlab
```

## Develop without Datalayer UI

You can use `pip install -e .` after removing the Datalayer UI dependencies.

The following files must be modified to remove the Datalayer UI dependencies:

### 1. `src/DatalayerApp.tsx`

Remove the entire content.

### 2. `src/jupyterlab/index.ts`

Remove the entire content.

### 3. `dalayer_core/__init__.py`

Remove the line `from datalayer_core._version import __version__`.

Add `__version__ = '1.0.24'`.

### 4. `pyproject.toml`

Remove the following lines:

```toml
[tool.hatch.version]
source = "nodejs"
```

```toml
[tool.hatch.metadata.hooks.nodejs]
fields = ["description", "authors", "urls"]
```

```toml
[tool.hatch.build.hooks.jupyter-builder]
dependencies = ["hatch-jupyter-builder>=0.5"]
build-function = "hatch_jupyter_builder.npm_builder"
ensured-targets = [
    "datalayer_core/labextension/static/style.js",
    "datalayer_core/labextension/package.json",
]
skip-if-exists = ["datalayer_core/labextension/static/style.js"]

[tool.hatch.build.hooks.jupyter-builder.build-kwargs]
build_cmd = "build:prod"
npm = ["jlpm"]

[tool.hatch.build.hooks.jupyter-builder.editable-build-kwargs]
build_cmd = "install:extension"
npm = ["jlpm"]
source_dir = "src"
build_dir = "datalayer_core/labextension"

[tool.jupyter-releaser.options]
version_cmd = "hatch version"
```

Add the following lines:

```toml
[tool.hatch.version]
path = "datalayer_core/__init__.py"
```

### 5. `package.json`

Remove the following lines:

```json
  "dependencies": {
    "@datalayer/ui": "^0.3.9"
  },
```