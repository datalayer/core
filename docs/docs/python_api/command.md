---
sidebar_label: command
title: command
---

The root `datalayer` command.

This does nothing other than dispatch to subcommands or output path info.

## DatalayerParser Objects

```python
class DatalayerParser(argparse.ArgumentParser)
```

A Datalayer argument parser.

#### epilog

```python
@property
def epilog()
```

Add subcommands to epilog on request

Avoids searching PATH for subcommands unless help output is requested.

#### epilog

```python
@epilog.setter
def epilog(x)
```

Ignore epilog set in Parser.__init__

#### argcomplete

```python
def argcomplete()
```

Trigger auto-completion, if enabled

#### datalayer\_parser

```python
def datalayer_parser() -> DatalayerParser
```

Create a datalayer parser object.

#### list\_subcommands

```python
def list_subcommands() -> List[str]
```

List all datalayer subcommands

searches PATH for `datalayer-name`

Returns a list of datalayer&#x27;s subcommand names, without the `datalayer-` prefix.
Nested children (e.g. datalayer-sub-subsub) are not included.

#### main

```python
def main() -> None
```

The command entry point.

