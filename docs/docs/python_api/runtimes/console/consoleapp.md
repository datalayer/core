---
sidebar_label: consoleapp
title: runtimes.console.consoleapp
---

## RuntimesConsoleApp Objects

```python
class RuntimesConsoleApp(DatalayerAuthMixin, KonsoleApp)
```

Console for Datalayer remote kernels.

#### initialize

```python
@catch_config_error
def initialize(argv: t.Any = None) -> None
```

Do actions after construct, but before starting the app.

#### init\_kernel\_manager

```python
def init_kernel_manager() -> None
```

Initialize the kernel manager.

