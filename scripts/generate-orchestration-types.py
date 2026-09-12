#!/usr/bin/env python3
# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Generate deterministic TypeScript types from the canonical orchestration models.

The pydantic models in ``datalayer_core/orchestration`` are the source of
truth (PLAN_ORCHESTRATOR.md, 19.8) and ``src/api/orchestration/generated.ts``
is what they say, in TypeScript, for the browser and the app. This is the
``generate-contents-types.py`` and ``generate-mcp-types.py`` pattern with two
documents rather than one:

- the models themselves, walked, for every canonical record and vocabulary
  — including those no route carries, such as a descriptor mapping;
- the control plane's OpenAPI document (O1-01), checked in by the agents
  service, for the answers that wrap those records and for the operations
  the app may call. Every canonical schema the control plane serves must be
  the one the models give, or this refuses to write anything: a service
  answering a different shape than ``core`` declares is exactly the drift the
  generated file exists to catch. ``DATALAYER_ORCHESTRATION_OPENAPI`` names
  another copy of that document.

What is written:

- one ``interface`` per model and one ``type`` per shared vocabulary, camel
  case on the wire because the plan writes the model that way in section 5.2
  and because a browser that has to convert is a browser that can convert
  wrongly;
- ``ORCHESTRATION_LIFECYCLE``: the states, the terminal states and the
  transition table of section 6.1, so the TypeScript state machine (O0-02)
  reads the same data the Python one does rather than a copy of it;
- ``ORCHESTRATION_COMMANDS``: the twelve commands and which of them mutate,
  so that "every mutating command carries an idempotency key" (6.4) is one
  fact in one place;
- ``ORCHESTRATION_ACKNOWLEDGEMENT_ORDER``: the five milestones of 6.3, in
  order, because "has it reached acceptance yet" is a comparison;
- ``ORCHESTRATION_LIMITS``: the default depth, fan-out and retry limits of
  19.8, read from the models' own defaults;
- ``ORCHESTRATION_FIELDS``: which fields each model has, and which model
  each nested one holds. TypeScript
  types vanish at runtime and ``src/**/__tests__`` is outside the tsconfig,
  so this is what lets the vitest suite hold the shared fixture to the same
  contract the pytest suite holds it to;
- ``ORCHESTRATION_API``: every operation of the control plane — its command
  name, method and path — so a client builds no orchestration URL of its
  own and a spec can hold the app's calls to the service's routes.

``--check`` exits non-zero when the checked-in file is not what the models
give — the CI check that the file is current.
"""

from __future__ import annotations

import importlib
import json
import os
import pkgutil
import sys
from enum import Enum
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))
DEFAULT_CONTROL_PLANE = (
    ROOT.parents[2]
    / "k8s/services/ai-agents/datalayer_ai_agents/contracts/v1/orchestration-openapi.json"
)
CONTROL_PLANE = Path(
    os.environ.get("DATALAYER_ORCHESTRATION_OPENAPI", DEFAULT_CONTROL_PLANE)
)
#: What FastAPI adds to every document for its own request validation. Not
#: the control plane's vocabulary, and a `ValidationError` exported from
#: `core` would shadow every other one a consumer imports.
FRAMEWORK_SCHEMAS = frozenset({"HTTPValidationError", "ValidationError"})

from datalayer_core.orchestration.base import CanonicalModel  # noqa: E402
from datalayer_core.orchestration.commands import (  # noqa: E402
    COMMAND_MODELS,
    is_mutating,
)
from datalayer_core.orchestration.events import ACKNOWLEDGEMENT_ORDER  # noqa: E402
from datalayer_core.orchestration.execution import (  # noqa: E402
    DelegationLimits,
    RetryPolicy,
)
from datalayer_core.orchestration.lifecycle import (  # noqa: E402
    INITIAL_STATE,
    TERMINAL_STATES,
    TRANSITIONS,
    ExecutionState,
    LifecycleEvent,
)

PACKAGE = "datalayer_core.orchestration"
OUTPUT = ROOT / "src/api/orchestration/generated.ts"
#: The licence header every source file in this repository carries, emitted
#: here for the same reason the MCP generator emits it: `fix-license-header`
#: adds one to whatever this writes, and then `--check` compares that against
#: output that never had one, and the two CI jobs break each other forever.
LICENCE = (
    "/*\n"
    " * Copyright (c) 2023-2025 Datalayer, Inc.\n"
    " * Distributed under the terms of the Modified BSD License.\n"
    " */"
)
HEADER = (
    "/* This file is generated from the datalayer_core.orchestration "
    "pydantic models and the control plane's OpenAPI document. Do not edit. */"
)
#: Everything under `src` is prettier-checked, and prettier rewrites double
#: quotes to single ones and reflows anything that does not fit. Emitting
#: `json.dumps` output here would mean the formatter and this generator
#: disagreed permanently about the same file, so what is emitted is what
#: prettier would have written: single quotes, 80 columns, trailing commas.
PRINT_WIDTH = 80
INDENT = "  "


def quote(value: str) -> str:
    """
    Return a TypeScript string literal, quoted the way prettier quotes.

    Parameters
    ----------
    value : str
        The string to quote.

    Returns
    -------
    str
        The literal, in single quotes.
    """
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def type_name(reference: str) -> str:
    """
    Return the model name a JSON Schema reference points at.

    Parameters
    ----------
    reference : str
        A `$ref` string.

    Returns
    -------
    str
        The name at the end of it.
    """
    return reference.rsplit("/", 1)[-1]


def ts_type(schema: dict[str, Any]) -> str:
    """
    Return the TypeScript type for one JSON Schema node.

    Parameters
    ----------
    schema : dict[str, Any]
        The schema node.

    Returns
    -------
    str
        Its TypeScript spelling.
    """
    if "$ref" in schema:
        return type_name(schema["$ref"])
    if "const" in schema:
        return quote(schema["const"])
    if "enum" in schema:
        return " | ".join(quote(value) for value in schema["enum"])
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


def summary(description: str | None) -> str | None:
    """
    Return the first paragraph of a docstring, as one line.

    The whole docstring belongs in the Python module, where the reasoning
    around it is; the TypeScript reader gets the sentence that says what the
    type is and a pointer to the rest.

    Parameters
    ----------
    description : str | None
        The description the schema carries, if any.

    Returns
    -------
    str | None
        One line, or None when there is nothing to say.
    """
    if not description:
        return None
    paragraph = description.strip().split("\n\n")[0]
    return " ".join(paragraph.split())


def literal(value: Any, indent: int, used: int) -> list[str]:
    """
    Render a JSON value as TypeScript, laid out the way prettier lays it out.

    Prettier keeps a literal on one line when it fits inside the print width
    and expands it when it does not, so that is what is emitted: the file is
    then a fixed point of both this generator and the formatter.

    Parameters
    ----------
    value : Any
        The value to render.
    indent : int
        How many levels the value is nested at.
    used : int
        How many columns are already taken on the opening line.

    Returns
    -------
    list[str]
        The lines, the first of them without its leading indentation.
    """
    flat = _flat(value)
    if used + len(flat) <= PRINT_WIDTH:
        return [flat]
    pad = INDENT * (indent + 1)
    lines: list[str] = []
    if isinstance(value, dict):
        lines.append("{")
        for key, item in value.items():
            prefix = f"{_key(key)}: "
            rendered = literal(item, indent + 1, len(pad) + len(prefix) + 1)
            lines.append(f"{pad}{prefix}{rendered[0]}")
            lines.extend(rendered[1:])
            lines[-1] += ","
        lines.append(f"{INDENT * indent}}}")
        return lines
    lines.append("[")
    for item in value:
        rendered = literal(item, indent + 1, len(pad) + 1)
        lines.append(f"{pad}{rendered[0]}")
        lines.extend(rendered[1:])
        lines[-1] += ","
    lines.append(f"{INDENT * indent}]")
    return lines


def _key(key: str) -> str:
    """
    Return an object key, quoted only when TypeScript needs it quoted.

    Parameters
    ----------
    key : str
        The key.

    Returns
    -------
    str
        The key as it is written in a literal.
    """
    plain = key.replace("_", "a").isalnum() and not key[0].isdigit()
    return key if plain else quote(key)


def _flat(value: Any) -> str:
    """
    Return the one-line rendering of a value.

    Parameters
    ----------
    value : Any
        The value to render.

    Returns
    -------
    str
        The value on one line, without trailing comma.
    """
    if isinstance(value, dict):
        if not value:
            return "{}"
        inner = ", ".join(f"{_key(k)}: {_flat(v)}" for k, v in value.items())
        return f"{{ {inner} }}"
    if isinstance(value, (list, tuple)):
        return f"[{', '.join(_flat(item) for item in value)}]"
    if isinstance(value, str):
        return quote(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    return json.dumps(value)


def _declare(name: str, annotation: str, value: Any) -> list[str]:
    """
    Render one exported constant with an explicit type.

    Parameters
    ----------
    name : str
        The constant's name.
    annotation : str
        Its TypeScript type.
    value : Any
        Its value.

    Returns
    -------
    list[str]
        The lines of the declaration.
    """
    opening = f"export const {name}: {annotation} = "
    flat = _flat(value)
    if len(opening) + len(flat) + 1 <= PRINT_WIDTH:
        return [f"{opening}{flat};"]
    # Prettier breaks after the `=` and puts the value on its own line when it
    # fits there, before it gives up and expands the literal.
    if len(INDENT) + len(flat) + 1 <= PRINT_WIDTH:
        return [opening.rstrip(), f"{INDENT}{flat};"]
    rendered = literal(value, 0, len(opening))
    return [f"{opening}{rendered[0]}", *rendered[1:-1], f"{rendered[-1]};"]


def _union(name: str, members: list[str]) -> list[str]:
    """
    Render a union type alias, broken over lines the way prettier breaks one.

    Parameters
    ----------
    name : str
        The alias name.
    members : list[str]
        The union's members, already spelled in TypeScript.

    Returns
    -------
    list[str]
        The lines of the alias.
    """
    joined = " | ".join(members)
    single = f"export type {name} = {joined};"
    if len(single) <= PRINT_WIDTH:
        return [single]
    # As with a constant, prettier first tries the whole union on the next
    # line and only then puts each member on one of its own.
    if len(INDENT) + len(joined) + 1 <= PRINT_WIDTH:
        return [f"export type {name} =", f"{INDENT}{joined};"]
    return [
        f"export type {name} =",
        *[f"{INDENT}| {member}" for member in members[:-1]],
        f"{INDENT}| {members[-1]};",
    ]


def _put(schemas: dict[str, Any], name: str, schema: dict[str, Any]) -> None:
    """
    Add one schema, refusing two definitions of the same name.

    Parameters
    ----------
    schemas : dict[str, Any]
        The schemas collected so far.
    name : str
        The name being defined.
    schema : dict[str, Any]
        Its definition.

    Raises
    ------
    SystemExit
        When one name has two different definitions, which would make the
        generated file depend on the order the modules were walked in.
    """
    if name in schemas and schemas[name] != schema:
        raise SystemExit(f"Two different definitions of '{name}' in {PACKAGE}.")
    schemas[name] = schema


def read_models() -> dict[str, Any]:
    """
    Return every canonical schema, in an OpenAPI-shaped document.

    The package is walked rather than listed, so a model added to it reaches
    TypeScript without anybody remembering to name it here — and the check
    gate fails until the generated file is regenerated. Enums are collected
    directly as well as through the models that reference them: a vocabulary
    no field happens to use, such as the context kinds, is still part of the
    contract.

    Returns
    -------
    dict[str, Any]
        A document with `components.schemas`, as the other generators read.
    """
    package = importlib.import_module(PACKAGE)
    models: dict[str, type[CanonicalModel]] = {}
    enums: dict[str, type[Enum]] = {}
    for found in sorted(pkgutil.iter_modules(package.__path__), key=lambda m: m.name):
        module = importlib.import_module(f"{PACKAGE}.{found.name}")
        for member in vars(module).values():
            if not isinstance(member, type):
                continue
            if not member.__module__.startswith(PACKAGE):
                continue
            if issubclass(member, CanonicalModel) and member is not CanonicalModel:
                models[member.__name__] = member
            elif issubclass(member, Enum):
                enums[member.__name__] = member
    schemas: dict[str, Any] = {}
    for name, model in sorted(models.items()):
        schema = model.model_json_schema(
            ref_template="#/components/schemas/{model}", by_alias=True
        )
        for defined, definition in sorted(schema.pop("$defs", {}).items()):
            _put(schemas, defined, definition)
        _put(schemas, name, schema)
    for name, enum in sorted(enums.items()):
        if name not in schemas:
            _put(schemas, name, _enum_schema(enum))
    return {"components": {"schemas": schemas}}


def _without_null_defaults(schema: Any) -> Any:
    """
    Return a schema without its `default: null` entries.

    FastAPI leaves those out of an OpenAPI document and pydantic keeps them
    in a model's schema; they say the same thing, and no TypeScript written
    here reads them.

    Parameters
    ----------
    schema : Any
        The schema node.

    Returns
    -------
    Any
        The node, with every null default removed at every depth.
    """
    if isinstance(schema, dict):
        return {
            key: _without_null_defaults(value)
            for key, value in schema.items()
            if not (key == "default" and value is None)
        }
    if isinstance(schema, list):
        return [_without_null_defaults(item) for item in schema]
    return schema


def read_control_plane(models: dict[str, Any]) -> dict[str, Any]:
    """
    Return the models' document with the control plane's answers and operations.

    Parameters
    ----------
    models : dict[str, Any]
        The document `read_models` produced.

    Returns
    -------
    dict[str, Any]
        The canonical schemas, the control plane's own schemas beside them,
        and the control plane's paths.

    Raises
    ------
    SystemExit
        When the document is missing, or serves a canonical record in a shape
        the models do not give.
    """
    if not CONTROL_PLANE.exists():
        raise SystemExit(
            f"No orchestration OpenAPI document at {CONTROL_PLANE}: run "
            "`make openapi-orchestration` in services/ai-agents, or name a copy "
            "with DATALAYER_ORCHESTRATION_OPENAPI."
        )
    document = json.loads(CONTROL_PLANE.read_text())
    schemas = dict(models["components"]["schemas"])
    for name, schema in sorted(document["components"]["schemas"].items()):
        if name in FRAMEWORK_SCHEMAS:
            continue
        if name in schemas:
            if _without_null_defaults(schema) != _without_null_defaults(schemas[name]):
                raise SystemExit(
                    f"The control plane serves '{name}' in a shape the "
                    f"{PACKAGE} models do not give; regenerate its document "
                    "from the models it imports."
                )
            continue
        schemas[name] = schema
    return {"components": {"schemas": schemas}, "paths": document["paths"]}


def _enum_schema(enum: type[Enum]) -> dict[str, Any]:
    """
    Return the schema pydantic gives an enum, for one no model references.

    Parameters
    ----------
    enum : type[Enum]
        The vocabulary.

    Returns
    -------
    dict[str, Any]
        Its JSON Schema.
    """
    schema: dict[str, Any] = {
        "enum": [member.value for member in enum],
        "title": enum.__name__,
        "type": "string",
    }
    if enum.__doc__:
        schema["description"] = enum.__doc__.strip()
    return dict(sorted(schema.items()))


def generate(document: dict[str, Any]) -> str:
    """
    Return the whole of the generated TypeScript file.

    Parameters
    ----------
    document : dict[str, Any]
        The document `read_models` produced.

    Returns
    -------
    str
        The file's content.
    """
    schemas = document["components"]["schemas"]
    lines = [LICENCE, "", HEADER, ""]
    for name, schema in sorted(schemas.items()):
        described = summary(schema.get("description"))
        if described:
            lines.append(f"/** {described} */")
        if schema.get("type") == "object" and "properties" in schema:
            lines.append(f"export interface {name} {{")
            required = set(schema.get("required", []))
            for property_name, property_schema in schema["properties"].items():
                field = summary(property_schema.get("description"))
                if field:
                    lines.append(f"{INDENT}/** {field} */")
                optional = "" if property_name in required else "?"
                lines.append(
                    f"{INDENT}{property_name}{optional}: {ts_type(property_schema)};"
                )
            lines.extend(["}", ""])
        elif "enum" in schema:
            lines.extend(_union(name, [quote(value) for value in schema["enum"]]))
            lines.append("")
        else:
            lines.extend([f"export type {name} = {ts_type(schema)};", ""])
    lines.extend(_lifecycle())
    lines.extend(_commands())
    lines.extend(_limits())
    lines.extend(_fields(schemas))
    lines.extend(_api(document.get("paths", {})))
    return "\n".join(lines)


def _api(paths: dict[str, Any]) -> list[str]:
    """
    Render every operation of the control plane (O1-01).

    Parameters
    ----------
    paths : dict[str, Any]
        The `paths` of the control plane's OpenAPI document.

    Returns
    -------
    list[str]
        The lines of the type and the constant.
    """
    value = [
        {
            "operation": operation["operationId"],
            "method": method.upper(),
            "path": path,
        }
        for path, operations in sorted(paths.items())
        for method, operation in sorted(operations.items())
    ]
    return [
        "/** One operation of the control plane: its name, method and path. */",
        "export interface OrchestrationOperation {",
        f"{INDENT}readonly operation: string;",
        f"{INDENT}readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';",
        f"{INDENT}readonly path: string;",
        "}",
        "",
        *_declare("ORCHESTRATION_API", "readonly OrchestrationOperation[]", value),
        "",
    ]


def _lifecycle() -> list[str]:
    """
    Render the lifecycle of section 6.1 as data (O0-02).

    Returns
    -------
    list[str]
        The lines of the type and the constant.
    """
    transitions = {
        state.value: {event.value: target.value for event, target in moves.items()}
        for state, moves in TRANSITIONS.items()
    }
    value = {
        "initial": INITIAL_STATE.value,
        "states": [state.value for state in ExecutionState],
        "terminal": [
            state.value for state in ExecutionState if state in TERMINAL_STATES
        ],
        "events": [event.value for event in LifecycleEvent],
        "transitions": transitions,
    }
    return [
        "/** The lifecycle of section 6.1: what a state accepts, and where it leads. */",
        "export interface OrchestrationLifecycle {",
        f"{INDENT}readonly initial: ExecutionState;",
        f"{INDENT}readonly states: readonly ExecutionState[];",
        f"{INDENT}readonly terminal: readonly ExecutionState[];",
        f"{INDENT}readonly events: readonly LifecycleEvent[];",
        f"{INDENT}readonly transitions: Readonly<",
        f"{INDENT}{INDENT}Record<ExecutionState, Readonly<LifecycleMoves>>",
        f"{INDENT}>;",
        "}",
        "",
        "/** Where one state goes, for the events it accepts. */",
        "export type LifecycleMoves = Partial<Record<LifecycleEvent, ExecutionState>>;",
        "",
        *_declare("ORCHESTRATION_LIFECYCLE", "OrchestrationLifecycle", value),
        "",
    ]


def _commands() -> list[str]:
    """
    Render the twelve commands and which of them mutate (O0-03).

    Returns
    -------
    list[str]
        The lines of the type and the constants.
    """
    commands = [
        {"name": name.value, "mutating": is_mutating(name)} for name in COMMAND_MODELS
    ]
    return [
        "/** One of the twelve commands, and whether it needs an idempotency key. */",
        "export interface OrchestrationCommand {",
        f"{INDENT}readonly name: CommandName;",
        f"{INDENT}readonly mutating: boolean;",
        "}",
        "",
        *_declare(
            "ORCHESTRATION_COMMANDS", "readonly OrchestrationCommand[]", commands
        ),
        "",
        "/** The five milestones of section 6.3, in the order they are reached. */",
        *_declare(
            "ORCHESTRATION_ACKNOWLEDGEMENT_ORDER",
            "readonly AcknowledgementKind[]",
            [kind.value for kind in ACKNOWLEDGEMENT_ORDER],
        ),
        "",
    ]


def _limits() -> list[str]:
    """
    Render the default delegation and retry limits of 19.8.

    Returns
    -------
    list[str]
        The lines of the type and the constant.
    """
    value = {
        "delegation": DelegationLimits().to_wire(),
        "retry": RetryPolicy().to_wire(),
    }
    return [
        "/** The default limits of 19.8, read from the models' own defaults. */",
        "export interface OrchestrationLimits {",
        f"{INDENT}readonly delegation: DelegationLimits;",
        f"{INDENT}readonly retry: RetryPolicy;",
        "}",
        "",
        *_declare("ORCHESTRATION_LIMITS", "OrchestrationLimits", value),
        "",
    ]


def _is_record(schema: Any) -> bool:
    """
    Say whether a schema describes a model rather than a vocabulary.

    Parameters
    ----------
    schema : Any
        The schema node.

    Returns
    -------
    bool
        True for an object with properties.
    """
    return (
        isinstance(schema, dict)
        and schema.get("type") == "object"
        and "properties" in schema
    )


def _referenced(schema: dict[str, Any], schemas: dict[str, Any]) -> str | None:
    """
    Return the model a property holds, through an array or an optional.

    Parameters
    ----------
    schema : dict[str, Any]
        The property's schema.
    schemas : dict[str, Any]
        Every collected schema, to tell a model from a vocabulary.

    Returns
    -------
    str | None
        The model's name, or None when the property holds no model.
    """
    if "$ref" in schema:
        name = type_name(schema["$ref"])
        return name if _is_record(schemas.get(name)) else None
    if schema.get("type") == "array":
        return _referenced(schema.get("items", {}), schemas)
    for option in schema.get("anyOf", []) + schema.get("oneOf", []):
        found = _referenced(option, schemas)
        if found:
            return found
    return None


def _fields(schemas: dict[str, Any]) -> list[str]:
    """
    Render each model's fields, for the tests that run without a type checker.

    ``refs`` says which model each nested property holds, so the vitest
    suite can walk a fixture document to its leaves the way pydantic does
    rather than checking only its top level.

    Parameters
    ----------
    schemas : dict[str, Any]
        The collected schemas.

    Returns
    -------
    list[str]
        The lines of the type and the constant.
    """
    value = {
        name: {
            "required": sorted(schema.get("required", [])),
            "optional": sorted(
                set(schema["properties"]) - set(schema.get("required", []))
            ),
            "refs": {
                prop: referenced
                for prop, sub in sorted(schema["properties"].items())
                if (referenced := _referenced(sub, schemas))
            },
        }
        for name, schema in sorted(schemas.items())
        if _is_record(schema)
    }
    return [
        "/** What each model declares, for the fixture checks of O0-01. */",
        "export interface OrchestrationModelFields {",
        f"{INDENT}readonly required: readonly string[];",
        f"{INDENT}readonly optional: readonly string[];",
        f"{INDENT}/** The model each nested property holds, by property name. */",
        f"{INDENT}readonly refs: Readonly<Record<string, string>>;",
        "}",
        "",
        *_declare(
            "ORCHESTRATION_FIELDS", "Record<string, OrchestrationModelFields>", value
        ),
        "",
    ]


#: The same operations for the Python client (O1-13), generated beside the
#: TypeScript so that neither client spells a route of its own.
PYTHON_OUTPUT = ROOT / "datalayer_core/orchestration/api.py"


def generate_python(document: dict[str, Any]) -> str:
    """
    Return the generated Python route table of the control plane.

    Parameters
    ----------
    document : dict[str, Any]
        The document `read_control_plane` produced.

    Returns
    -------
    str
        The module's content.
    """
    operations = [
        (operation["operationId"], method.upper(), path)
        for path, methods in sorted(document.get("paths", {}).items())
        for method, operation in sorted(methods.items())
    ]
    lines = [
        "# Copyright (c) 2023-2025 Datalayer, Inc.",
        "# Distributed under the terms of the Modified BSD License.",
        "",
        '"""',
        "Every operation of the orchestration control plane: its name, method and path.",
        "",
        "Generated from the control plane's OpenAPI document by",
        "``scripts/generate-orchestration-types.py``; do not edit. The Python client",
        "takes its paths from here as the TypeScript one takes them from",
        "``ORCHESTRATION_API`` in ``src/api/orchestration/generated.ts``, so",
        "neither spells a route of its own.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "from typing import NamedTuple",
        "",
        "",
        "class OrchestrationOperation(NamedTuple):",
        '    """One operation of the control plane."""',
        "",
        "    operation: str",
        "    method: str",
        "    path: str",
        "",
        "",
        "ORCHESTRATION_API: tuple[OrchestrationOperation, ...] = (",
        *[
            f"    OrchestrationOperation({json.dumps(name)}, {json.dumps(method)}, {json.dumps(path)}),"
            for name, method, path in operations
        ],
        ")",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    """
    Write the generated files, or check that the checked-in ones are current.

    Raises
    ------
    SystemExit
        When `--check` is given and a file is stale.
    """
    document = read_control_plane(read_models())
    outputs = {OUTPUT: generate(document), PYTHON_OUTPUT: generate_python(document)}
    if "--check" in sys.argv[1:]:
        stale = [
            str(path.relative_to(ROOT))
            for path, expected in outputs.items()
            if not path.exists() or path.read_text() != expected
        ]
        if stale:
            raise SystemExit(
                f"Stale generated orchestration files ({', '.join(stale)}): "
                "run `npm run generate:orchestration`"
            )
        return
    for path, expected in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(expected)


if __name__ == "__main__":
    main()
