---
sidebar_label: migrate
title: migrate
---

Migrating IPython < 4.0 to Datalayer\n\nThis *copies* configuration and resources to their new locations in Datalayer\n\nMigrations:\n\n- .ipython/\n  - nbextensions -> DATALAYER_DATA_DIR/nbextensions\n  - kernels ->  DATALAYER_DATA_DIR/kernels\n\n- .ipython/profile_default/\n  - static/custom -> .datalayer/custom\n  - nbconfig -> .datalayer/nbconfig\n  - security/\n\n    - notebook_secret, notebook_cookie_secret, nbsignatures.db -> DATALAYER_DATA_DIR\n\n  - ipython_&#123;notebook,nbconvert,qtconsole&#125;_config.py -> .datalayer/datalayer_&#123;name&#125;_config.py

#### get\_ipython\_dir

```python
def get_ipython_dir()
```

Return the IPython directory location.\n\nNot imported from IPython because the IPython implementation\nensures that a writable directory exists,\ncreating a temporary directory if not.\nWe don't want to trigger that when checking if migration should happen.\n\nWe only need to support the IPython < 4 behavior for migration,\nso importing for forward-compatibility and edge cases is not important.

#### migrate\_dir

```python
def migrate_dir(src, dst)
```

Migrate a directory from src to dst

#### migrate\_file

```python
def migrate_file(src, dst, substitutions=None)
```

Migrate a single file from src to dst\n\nsubstitutions is an optional dict of &#123;regex: replacement&#125; for performing replacements on the file.

#### migrate\_one

```python
def migrate_one(src, dst)
```

Migrate one item\n\ndispatches to migrate_dir/_file

#### migrate\_static\_custom

```python
def migrate_static_custom(src, dst)
```

Migrate non-empty custom.js,css from src to dst\n\nsrc, dst are 'custom' directories containing custom.&#123;js,css&#125;

#### migrate\_config

```python
def migrate_config(name, env)
```

Migrate a config file.\n\nIncludes substitutions for updated configurable names.

#### migrate

```python
def migrate()
```

Migrate IPython configuration to Datalayer

## DatalayerMigrate Objects

```python
class DatalayerMigrate(DatalayerApp)
```

A Datalayer Migration App.

#### start

```python
def start()
```

Start the application.

