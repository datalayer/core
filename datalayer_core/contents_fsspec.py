# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""An `fsspec` filesystem over a Cloud Storage source.

Kept out of `contents.py` because `fsspec` is not a dependency of this
package: a notebook that never asks for a filesystem should not need it
installed, and `CloudStorage.open()` already covers reading one object. This
module is imported only from `CloudStorage.filesystem()`.

What it is *not* is a second way to reach a bucket. Every method here goes
through the Contents routes the rest of the facade uses, so a path this
filesystem cannot see is a path the source was not configured to expose —
not a credential that happened to be narrower.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover - typing only
    from datalayer_core.contents import CloudStorage

try:
    from fsspec import AbstractFileSystem
except ImportError as error:  # pragma: no cover - exercised by its own test
    raise ImportError(
        "An fsspec filesystem needs fsspec installed: `pip install fsspec`. "
        "To read one object without it, use CloudStorage.open(path)."
    ) from error


class ContentsFileSystem(AbstractFileSystem):
    """A read-only `fsspec` filesystem backed by one Cloud Storage source.

    Read-only because the source is: Contents has no route that writes an
    object, so `_open` refuses a write mode instead of accepting bytes it
    would have nowhere to put.
    """

    protocol = "datalayer"

    def __init__(self, storage: "CloudStorage", **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.storage = storage

    def ls(self, path: str = "", detail: bool = True, **kwargs: Any) -> list[Any]:
        entries = [
            {
                "name": item["path"],
                "size": item.get("size", 0),
                "type": "directory" if item.get("is_directory") else "file",
                "etag": item.get("etag"),
                "modified_at": item.get("modified_at"),
            }
            for item in self.storage.ls(self._strip_protocol(path))
        ]
        return entries if detail else [entry["name"] for entry in entries]

    def info(self, path: str, **kwargs: Any) -> dict[str, Any]:
        found = self.storage.stat(self._strip_protocol(path))
        return {
            "name": found.get("path", path),
            "size": found.get("size", 0),
            "type": "directory" if found.get("is_directory") else "file",
            "etag": found.get("etag"),
            "modified_at": found.get("modified_at"),
        }

    def cat_file(
        self, path: str, start: int | None = None, end: int | None = None, **kwargs: Any
    ) -> bytes:
        # fsspec asks for byte ranges as two integers; HTTP wants one header,
        # and its end is inclusive where fsspec's is not.
        byte_range = None
        if start is not None or end is not None:
            byte_range = f"bytes={start or 0}-{'' if end is None else end - 1}"
        return b"".join(
            self.storage.iter_bytes(self._strip_protocol(path), byte_range=byte_range)
        )

    def _open(self, path: str, mode: str = "rb", **kwargs: Any) -> Any:
        if "r" not in mode:
            raise ValueError(
                f"A Cloud Storage source opens read-only, not '{mode}'. "
                "Write to a Dataset or a Volume instead."
            )
        return self.storage.open(self._strip_protocol(path))


__all__ = ["ContentsFileSystem"]
