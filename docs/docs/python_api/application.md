---
sidebar_label: application
title: application
---

A base Application class for Datalayer applications.\n\nAll Datalayer applications should inherit from this.

## NoStart Objects

```python
class NoStart(Exception)
```

Exception to raise when an application shouldn't start

## DatalayerApp Objects

```python
class DatalayerApp(Application)
```

Base class for Datalayer applications

#### name

override in subclasses

#### write\_default\_config

```python
def write_default_config()
```

Write our default config to a .py config file

#### migrate\_config

```python
def migrate_config()
```

Migrate config/data from IPython 3

#### load\_config\_file

```python
def load_config_file(suppress_errors=True)
```

Load the config file.\n\nBy default, errors in loading config are handled, and a warning\nprinted on screen. For testing, the suppress_errors option is set\nto False, so errors will make tests fail.

#### initialize

```python
@catch_config_error
def initialize(argv=None)
```

Initialize the application.

#### start

```python
def start()
```

Start the whole thing

#### launch\_instance

```python
@classmethod
def launch_instance(cls, argv=None, **kwargs)
```

Launch an instance of a Datalayer Application

