---
sidebar_label: manager
title: runtimes.manager
---

## RuntimeManager Objects

```python
class RuntimeManager(KernelHttpManager)
```

Manages a single Runtime.

#### \_\_init\_\_

```python
def __init__(run_url: str, token: str, username: str, **kwargs)
```

Initialize the gateway Runtime manager.

#### start\_kernel

```python
def start_kernel(name: str = "",
                 path: str | None = None,
                 timeout: float = REQUEST_TIMEOUT)
```

Starts a kernel on Datalayer cloud.

Parameters
----------
    name : str
        Runtime name
    path : str
        [optional] API path from root to the cwd of the kernel
    timeout : float
        Request timeout
Returns
-------
    The kernel model

