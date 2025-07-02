---
sidebar_label: utils
title: utils.utils
---

#### fetch

```python
def fetch(request: str,
          token: str | None = None,
          external_token: str | None = None,
          **kwargs: t.Any) -> requests.Response
```

Fetch a network resource as a context manager.

#### find\_http\_port

```python
def find_http_port() -> int
```

Find an available http port.

