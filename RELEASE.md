# Making a new release of datalayer

## Automated release (tags)

Pushing a tag `vX.Y.Z` publishes `datalayer_core` to PyPI and `@datalayer/core` to npm from
[`.github/workflows/release.yaml`](.github/workflows/release.yaml). No token is stored anywhere:
both registries trust that workflow file (OIDC trusted publishing).

### Cutting a release

1. Bump the version. npm and Python share one version: hatch reads the Python version from
   `package.json` (`[tool.hatch.version] source = "nodejs"`), so changing `"version"` in
   `package.json` changes both. `hatch version X.Y.Z` does the same edit.
2. Open a pull request with the bump, and merge it to `main` once CI is green.
3. Tag the merge commit on `main` and push the tag:

   ```bash
   git checkout main && git pull
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

### What the workflow does

- **build**: checks that the tag, the npm version (`package.json`) and the Python version
  (`hatch version`) are the same, and stops if they are not. Then `npm install --workspaces`,
  `npm run build` (which also bundles the CLI login page into `datalayer_core/static`) and
  `npm run build:lib`, `npm pack`, and `python -m build`. It checks that the wheel carries the
  built static assets, and uploads the npm tarball and the Python sdist and wheel as artifacts.
- **pypi**: publishes the sdist and wheel with `pypa/gh-action-pypi-publish`, in the `pypi`
  environment, with `id-token: write`.
- **npm**: updates npm to the latest version (trusted publishing needs npm 11.5.1 or later) and
  runs `npm publish <tarball> --access public --provenance`, in the `npm` environment, with
  `id-token: write`.

A failed publish can be re-run from the Actions tab. Neither registry accepts the same version
twice, so if something has to change after a publish, bump the version and push a new tag.

### One-time setup

- **PyPI**: on <https://pypi.org/manage/project/datalayer-core/settings/publishing/>, add a
  trusted publisher: owner `datalayer`, repository `core`, workflow `release.yaml`, environment
  `pypi`. The `pypi` environment already exists in the repository settings; restricting it to
  `v*` tags is recommended.
- **npm**: on the `@datalayer/core` package settings on npmjs.com, add a trusted publisher:
  GitHub Actions, organization `datalayer`, repository `core`, workflow `release.yaml`,
  environment `npm`. The `npm` environment already exists in the repository settings.

## Manual release

The extension can also be published to `PyPI` and `npm` manually or using the [Jupyter Releaser](https://github.com/jupyter-server/jupyter_releaser).

### Python package

This extension can be distributed as Python
packages. All of the Python
packaging instructions in the `pyproject.toml` file to wrap your extension in a
Python package. Before generating a package, we first need to install `build`.

```bash
pip install build twine hatch
```

Bump the version using `hatch`. By default this will create a tag.
See the docs on [hatch-nodejs-version](https://github.com/agoose77/hatch-nodejs-version#semver) for details.

```bash
hatch version <new-version>
```

To create a Python source package (`.tar.gz`) and the binary package (`.whl`) in the `dist/` directory, do:

```bash
python -m build
```

> `python setup.py sdist bdist_wheel` is deprecated and will not work for this package.

Then to upload the package to PyPI, do:

```bash
twine upload dist/*
```

## Automated releases with the Jupyter Releaser

The extension repository should already be compatible with the Jupyter Releaser.

Check out the [workflow documentation](https://github.com/jupyter-server/jupyter_releaser#typical-workflow) for more information.

Here is a summary of the steps to cut a new release:

- Fork the [`jupyter-releaser` repo](https://github.com/jupyter-server/jupyter_releaser)
- Add `ADMIN_GITHUB_TOKEN`, `PYPI_TOKEN` and `NPM_TOKEN` to the Github Secrets in the fork
- Go to the Actions panel
- Run the "Draft Changelog" workflow
- Merge the Changelog PR
- Run the "Draft Release" workflow
- Run the "Publish Release" workflow

## Publishing to `conda-forge`

If the package is not on conda forge yet, check the documentation to learn how to add it: https://conda-forge.org/docs/maintainer/adding_pkgs.html

Otherwise a bot should pick up the new version publish to PyPI, and open a new PR on the feedstock repository automatically.
