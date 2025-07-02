---
sidebar_label: utils
title: utils
---

#### ensure\_dir\_exists

```python
def ensure_dir_exists(path, mode=0o777)
```

Ensure that a directory exists

If it doesn&#x27;t exist, try to create it, protecting against a race condition
if another process is doing the same.
The default permissions are determined by the current umask.

#### deprecation

```python
def deprecation(message: str,
                internal: Union[str, List[str]] = "datalayer/") -> None
```

Generate a deprecation warning targeting the first frame that is not &#x27;internal&#x27;

internal is a string or list of strings, which if they appear in filenames in the
frames, the frames will be considered internal. Changing this can be useful if, for examnple,
we know that our internal code is calling out to another library.

## \_TaskRunner Objects

```python
class _TaskRunner()
```

A task runner that runs an asyncio event loop on a background thread.

#### run

```python
def run(coro)
```

Synchronously run a coroutine on a background thread.

#### run\_sync

```python
def run_sync(coro: Callable[..., Awaitable[T]]) -> Callable[..., T]
```

Wraps coroutine in a function that blocks until it has executed.

Parameters
----------
coro : coroutine-function
    The coroutine-function to be executed.

Returns
-------
result :
    Whatever the coroutine-function returns.

#### ensure\_async

```python
async def ensure_async(obj: Union[Awaitable[T], T]) -> T
```

Convert a non-awaitable object to a coroutine if needed,
and await it if it was not already awaited.

This function is meant to be called on the result of calling a function,
when that function could either be asynchronous or not.

