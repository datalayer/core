#!/usr/bin/env python3
# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Generate deterministic TypeScript wire types from the Jupyter MCP Server's
OpenAPI document, on the `generate-contents-types.py` pattern.

The gateway keeps no contract file: its FastAPI application *is* the
contract, and the document is read from it — imported from the sibling
checkout of the service when there is one, otherwise fetched from a running
gateway. `DATALAYER_JUPYTER_MCP_OPENAPI` names either a file or an URL and
wins over both; the deployed gateway publishes its document without
authentication at ``/api/mcp/v1/openapi.json``.

What is written to ``src/api/mcp/generated.ts``:

- one ``interface`` or ``type`` per ``components.schemas`` entry, snake case
  turned to camel case as the Contents generator does;
- ``MCP_GATEWAY_ROUTES``: the routes the document declares, with method,
  path, operation id and parameters, so a client that names a route the
  gateway dropped fails to type-check rather than at runtime.

``--check`` exits non-zero when the checked-in file differs from what the
document gives — the CI check that the file is current.
"""

from __future__ import annotations

import importlib
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path(__file__).parents[1]
DEFAULT_GATEWAY_CHECKOUT = ROOT.parents[2] / "k8s/services/jupyter-mcp-server"
DEFAULT_GATEWAY_OPENAPI_URL = "https://mcp.datalayer.run/api/mcp/v1/openapi.json"
GATEWAY_APP = "datalayer_jupyter_mcp_server.main:app"
OUTPUT = ROOT / "src/api/mcp/generated.ts"
#: The licence header every source file in this repository carries. It is
#: emitted here because `fix-license-header` adds it to whatever this writes,
#: and then `--check` compares that against output that never had one — so the
#: two CI jobs each broke the other, permanently, and the check was red for
#: reasons that had nothing to do with the types. It stayed red long enough
#: for a dozen MCP routes to drift without anybody being able to see it.
LICENCE = (
    "/*\n"
    " * Copyright (c) 2023-2025 Datalayer, Inc.\n"
    " * Distributed under the terms of the Modified BSD License.\n"
    " */"
)

HEADER = "/* This file is generated from the Datalayer Jupyter MCP Server OpenAPI. Do not edit. */"


def type_name(reference: str) -> str:
    return reference.rsplit("/", 1)[-1]


def ts_type(schema: dict[str, Any]) -> str:
    if "$ref" in schema:
        return type_name(schema["$ref"])
    if "const" in schema:
        return json.dumps(schema["const"])
    if "enum" in schema:
        return " | ".join(json.dumps(value) for value in schema["enum"])
    if "oneOf" in schema:
        return " | ".join(ts_type(item) for item in schema["oneOf"])
    if "anyOf" in schema:
        return " | ".join(ts_type(item) for item in schema["anyOf"])
    kind = schema.get("type")
    if isinstance(kind, list):
        return " | ".join(
            "null" if item == "null" else ts_type({"type": item}) for item in kind
        )
    if kind == "array":
        return f"Array<{ts_type(schema.get('items', {}))}>"
    if kind == "object":
        additional = schema.get("additionalProperties")
        return (
            f"Record<string, {ts_type(additional)}>"
            if isinstance(additional, dict)
            else "Record<string, unknown>"
        )
    if kind in {"integer", "number"}:
        return "number"
    if kind == "boolean":
        return "boolean"
    if kind == "null":
        return "null"
    if kind == "string":
        return "string"
    return "unknown"


def camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def _read_from_checkout(checkout: Path) -> dict[str, Any] | None:
    """The document of the application in a sibling checkout, in a subprocess.

    A subprocess so the gateway's imports — its dependencies, its logging
    configuration — never leak into this one, and so an environment that
    cannot import it says so cleanly and the fetch takes over.
    """
    if not (checkout / "datalayer_jupyter_mcp_server").is_dir():
        return None
    module, _, attribute = GATEWAY_APP.partition(":")
    code = (
        "import json, sys\n"
        f"from {module} import {attribute} as app\n"
        "json.dump(app.openapi(), sys.stdout)\n"
    )
    completed = subprocess.run(
        [sys.executable, "-c", code],
        cwd=checkout,
        capture_output=True,
        text=True,
        env={**os.environ, "LOG_LEVEL": "ERROR"},
    )
    if completed.returncode != 0:
        sys.stderr.write(
            f"Could not import {GATEWAY_APP} from {checkout}; "
            "reading the deployed gateway instead.\n"
        )
        return None
    return json.loads(completed.stdout)


def _read_from_url(url: str) -> dict[str, Any]:
    with urlopen(Request(url, headers={"Accept": "application/json"}), timeout=15) as response:
        return json.load(response)


def read_openapi() -> dict[str, Any]:
    """The document, from the override, the sibling checkout or the deployed gateway."""
    override = os.environ.get("DATALAYER_JUPYTER_MCP_OPENAPI", "").strip()
    if override.startswith(("http://", "https://")):
        return _read_from_url(override)
    if override:
        return json.loads(Path(override).read_text())
    document = _read_from_checkout(DEFAULT_GATEWAY_CHECKOUT)
    if document is not None:
        return document
    return _read_from_url(DEFAULT_GATEWAY_OPENAPI_URL)


def _routes(document: dict[str, Any]) -> list[dict[str, Any]]:
    routes = []
    for path, operations in sorted(document.get("paths", {}).items()):
        for method, operation in sorted(operations.items()):
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            routes.append(
                {
                    "method": method.upper(),
                    "path": path,
                    "operationId": operation.get("operationId", ""),
                    "parameters": [
                        {"name": parameter["name"], "in": parameter["in"]}
                        for parameter in operation.get("parameters", [])
                    ],
                }
            )
    return routes


def generate(document: dict[str, Any]) -> str:
    schemas = (document.get("components") or {}).get("schemas") or {}
    lines = [LICENCE, "", HEADER, ""]
    for name, schema in sorted(schemas.items()):
        if schema.get("type") == "object" and "properties" in schema:
            lines.append(f"export interface {name} {{")
            required = set(schema.get("required", []))
            for property_name, property_schema in schema["properties"].items():
                optional = "" if property_name in required else "?"
                lines.append(
                    f"  {camel(property_name)}{optional}: {ts_type(property_schema)};"
                )
            lines.extend(["}", ""])
        else:
            lines.extend([f"export type {name} = {ts_type(schema)};", ""])
    lines.extend(
        [
            "/** One REST route the gateway declares. */",
            "export interface McpGatewayRoute {",
            "  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';",
            "  path: string;",
            "  operationId: string;",
            "  parameters: Array<{ name: string; in: string }>;",
            "}",
            "",
            f"/** The gateway version the routes were read from: {document.get('info', {}).get('version', '')}. */",
            "export const MCP_GATEWAY_ROUTES: ReadonlyArray<McpGatewayRoute> = [",
        ]
    )
    for route in _routes(document):
        parameters = ", ".join(
            f"{{ name: {json.dumps(p['name'])}, in: {json.dumps(p['in'])} }}"
            for p in route["parameters"]
        )
        lines.append(
            f"  {{ method: '{route['method']}', path: {json.dumps(route['path'])}, "
            f"operationId: {json.dumps(route['operationId'])}, parameters: [{parameters}] }},"
        )
    lines.extend(["];", ""])
    return "\n".join(lines)


def main() -> None:
    expected = generate(read_openapi())
    if "--check" in sys.argv[1:]:
        if not OUTPUT.exists() or OUTPUT.read_text() != expected:
            raise SystemExit(
                "Stale generated Jupyter MCP Server TypeScript types: "
                "run `python scripts/generate-mcp-types.py`"
            )
        return
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(expected)


if __name__ == "__main__":
    main()
