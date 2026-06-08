# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Unit tests for datalayer exec example file generators."""

from pathlib import Path

from datalayer_core.cli.commands.exec import (
    _create_example_notebook_file,
    _create_example_python_file,
)


def test_create_example_python_file() -> None:
    path = _create_example_python_file()
    try:
        assert path.exists()
        assert path.suffix == ".py"
        content = path.read_text(encoding="utf-8")
        assert "--example-py" in content
    finally:
        path.unlink(missing_ok=True)


def test_create_example_notebook_file() -> None:
    path = _create_example_notebook_file()
    try:
        assert path.exists()
        assert path.suffix == ".ipynb"
        content = path.read_text(encoding="utf-8")
        assert "--example-notebook" in content
        assert '"cells"' in content
    finally:
        path.unlink(missing_ok=True)
