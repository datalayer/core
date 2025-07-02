---
sidebar_label: http_server
title: authn.http_server
---

## LoginRequestHandler Objects

```python
class LoginRequestHandler(SimpleHTTPRequestHandler)
```

Custom simple http request handler to serve static files\nfrom a directory and handle receiving the authentication token\nfor CLI usage.

#### get\_token

```python
def get_token(run_url: str,
              port: int | None = None,
              logger: logging.Logger = logger) -> tuple[str, str] | None
```

Get the user handle and token.

