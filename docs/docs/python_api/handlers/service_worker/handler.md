---
sidebar_label: handler
title: handlers.service_worker.handler
---

## ServiceWorkerHandler Objects

```python
class ServiceWorkerHandler(web.StaticFileHandler, JupyterHandler)
```

Serve the service worker script.

#### initialize

```python
def initialize()
```

Initialize the API spec handler.

#### validate\_absolute\_path

```python
def validate_absolute_path(root: str, absolute_path: str) -> Optional[str]
```

Only allow to serve the service worker

#### get\_content\_type

```python
def get_content_type()
```

Get the content type.

#### set\_extra\_headers

```python
def set_extra_headers(path: str) -> None
```

Add extra headers to the response

