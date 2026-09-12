#!/usr/bin/env python3
# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Generate deterministic TypeScript wire types from Contents OpenAPI."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parents[1]
DEFAULT_OPENAPI = (
    ROOT.parents[2]
    / "k8s/services/contents/datalayer_contents/contracts/v1/openapi.json"
)
OPENAPI = Path(os.environ.get("DATALAYER_CONTENTS_OPENAPI", DEFAULT_OPENAPI))
DEFAULT_CONTRACT_FIXTURES = (
    ROOT.parents[2] / "k8s/services/contents/tests/fixtures/v1-contracts.json"
)
DEFAULT_SOLR_CODEC_FIXTURE = (
    ROOT.parents[2]
    / "k8s/services/common/datalayer_common/tests/fixtures/solr_codec.json"
)
CONTRACT_FIXTURES = Path(
    os.environ.get("DATALAYER_CONTENTS_CONTRACT_FIXTURES", DEFAULT_CONTRACT_FIXTURES)
)
SOLR_CODEC_FIXTURE = Path(
    os.environ.get("DATALAYER_SOLR_CODEC_FIXTURE", DEFAULT_SOLR_CODEC_FIXTURE)
)
OUTPUT = ROOT / "src/api/contents/generated.ts"
PYTHON_OUTPUT = ROOT / "datalayer_core/models/contents/generated.py"
CLIENT_CONTRACT_FIXTURES = ROOT / "src/models/contents/__fixtures__/v1-contracts.json"
CLIENT_SOLR_CODEC_FIXTURE = ROOT / "src/models/contents/__fixtures__/solr-codec.json"


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


def generate() -> str:
    document = json.loads(OPENAPI.read_text())
    schemas = document["components"]["schemas"]
    lines = [
        "/* This file is generated from Datalayer Contents OpenAPI. Do not edit. */",
        "",
    ]
    for name, schema in schemas.items():
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
    return "\n".join(lines)


def main() -> None:
    expected = generate()
    expected_fixtures = CONTRACT_FIXTURES.read_text()
    expected_solr_fixture = SOLR_CODEC_FIXTURE.read_text()
    check = "--check" in sys.argv[1:]
    if check:
        if not OUTPUT.exists() or OUTPUT.read_text() != expected:
            raise SystemExit("Stale generated Contents TypeScript types")
        if (
            not CLIENT_CONTRACT_FIXTURES.exists()
            or CLIENT_CONTRACT_FIXTURES.read_text() != expected_fixtures
        ):
            raise SystemExit("Stale generated Contents contract fixtures")
        if (
            not CLIENT_SOLR_CODEC_FIXTURE.exists()
            or CLIENT_SOLR_CODEC_FIXTURE.read_text() != expected_solr_fixture
        ):
            raise SystemExit("Stale generated Solr codec fixture")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(expected)
        CLIENT_CONTRACT_FIXTURES.parent.mkdir(parents=True, exist_ok=True)
        CLIENT_CONTRACT_FIXTURES.write_text(expected_fixtures)
        CLIENT_SOLR_CODEC_FIXTURE.write_text(expected_solr_fixture)

    with tempfile.TemporaryDirectory() as temporary_directory:
        generated_python = (
            Path(temporary_directory) / "generated.py" if check else PYTHON_OUTPUT
        )
        generated_python.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "datamodel-codegen",
                "--input",
                str(OPENAPI),
                "--input-file-type",
                "openapi",
                "--output",
                str(generated_python),
                "--output-model-type",
                "pydantic_v2.BaseModel",
                "--target-python-version",
                "3.10",
                "--use-standard-collections",
                "--use-union-operator",
                "--disable-timestamp",
                "--enum-field-as-literal",
                "all",
                "--collapse-root-models",
            ],
            check=True,
        )
        if check and (
            not PYTHON_OUTPUT.exists()
            or PYTHON_OUTPUT.read_text() != generated_python.read_text()
        ):
            raise SystemExit("Stale generated Contents Python types")


if __name__ == "__main__":
    main()
