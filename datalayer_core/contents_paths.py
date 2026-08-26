# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Canonical path handling shared by Contents persistence and storage adapters."""

from __future__ import annotations

import unicodedata


def normalize_object_path(path: str) -> str:
    """Return one relative NFC POSIX path or reject an ambiguous boundary."""

    if not isinstance(path, str) or not path:
        raise ValueError("object path is required")
    normalized = unicodedata.normalize("NFC", path)
    if "\x00" in normalized or "\\" in normalized or normalized.startswith("/"):
        raise ValueError("object path must be a relative POSIX path")
    segments = normalized.split("/")
    if any(segment in {"", ".", ".."} for segment in segments):
        raise ValueError("object path contains an empty or traversal segment")
    return "/".join(segments)
