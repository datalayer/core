---
sidebar_label: migrate
title: migrate
---

Migrating IPython &lt; 4.0 to Datalayer

This *copies* configuration and resources to their new locations in Datalayer

Migrations:

- .ipython/
  - nbextensions -&gt; DATALAYER_DATA_DIR/nbextensions
  - kernels -&gt;  DATALAYER_DATA_DIR/kernels

- .ipython/profile_default/
  - static/custom -&gt; .datalayer/custom
  - nbconfig -&gt; .datalayer/nbconfig
  - security/

    - notebook_secret, notebook_cookie_secret, nbsignatures.db -&gt; DATALAYER_DATA_DIR

  - ipython_{notebook,nbconvert,qtconsole}_config.py -&gt; .datalayer/datalayer_{name}_config.py

#### get\_ipython\_dir

```python
def get_ipython_dir()
```

Return the IPython directory location.

Not imported from IPython because the IPython implementation
ensures that a writable directory exists,
creating a temporary directory if not.
We don&#x27;t want to trigger that when checking if migration should happen.

We only need to support the IPython &lt; 4 behavior for migration,
so importing for forward-compatibility and edge cases is not important.

#### migrate\_dir

```python
def migrate_dir(src, dst)
```

Migrate a directory from src to dst

#### migrate\_file

```python
def migrate_file(src, dst, substitutions=None)
```

Migrate a single file from src to dst

substitutions is an optional dict of \{regex: replacement\} for performing replacements on the file.

#### migrate\_one

```python
def migrate_one(src, dst)
```

Migrate one item

dispatches to migrate_dir/_file

#### migrate\_static\_custom

```python
def migrate_static_custom(src, dst)
```

Migrate non-empty custom.js,css from src to dst

src, dst are &#x27;custom&#x27; directories containing custom.{js,css}

#### migrate\_config

```python
def migrate_config(name, env)
```

Migrate a config file.

Includes substitutions for updated configurable names.

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

