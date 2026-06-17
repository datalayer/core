# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Shared helpers for evals CLI and integrations."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

import typer

from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


def parse_json_value(raw: Optional[str], flag_name: str) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except Exception as exc:
        raise typer.BadParameter(f"Invalid JSON for {flag_name}: {exc}") from exc
    if not isinstance(parsed, dict):
        raise typer.BadParameter(f"{flag_name} must decode to an object")
    return parsed


def parse_json_file(path_value: Optional[str], flag_name: str) -> dict[str, Any]:
    if not path_value:
        return {}
    path = Path(path_value)
    if not path.exists():
        raise typer.BadParameter(f"File not found for {flag_name}: {path}")
    text = path.read_text(encoding="utf-8")
    return parse_json_value(text, flag_name)


def merge_dicts(*parts: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for part in parts:
        merged.update(part)
    return merged


def make_client(
    token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> DatalayerClient:
    urls = DatalayerURLs.from_environment()
    return DatalayerClient(urls=urls, token=(token or api_key))


def resolve_billable_account_uid(
    billable_account_uid: Optional[str],
    account_uid: Optional[str],
) -> Optional[str]:
    """Resolve billable account UID with backwards-compatible fallback."""
    return billable_account_uid or account_uid
