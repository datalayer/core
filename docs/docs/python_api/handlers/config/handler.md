---
sidebar_label: handler
title: handlers.config.handler
---

Datalayer handlers.

## ConfigHandler Objects

```python
class ConfigHandler(ExtensionHandlerMixin, APIHandler)
```

The handler for configuration.

#### get

```python
@tornado.web.authenticated
def get()
```

Returns the configuration of the server extension.

