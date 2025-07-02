---
sidebar_label: execapp
title: runtimes.exec.execapp
---

## RuntimesExecApp Objects

```python
class RuntimesExecApp(DatalayerCLIBaseApp)
```

Execute a file on a IPython Runtime.

#### initialize

```python
@catch_config_error
def initialize(argv=None)
```

Do actions after construct, but before starting the app.

#### init\_kernel\_client

```python
def init_kernel_client() -> None
```

Initialize the kernel client.

