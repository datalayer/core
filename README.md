[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Ξ Datalayer

> Datalayer core.

Datalayer is the base foundation package used by many other Datalayer packages. It contains base application classes and configuration inherited by other projects.

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

## Releases

Jupyter Viewer is released in [PyPI](https://pypi.org/project/datalayer).
