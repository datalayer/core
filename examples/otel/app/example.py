# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Simple logfire + pydantic_ai example that sends OTEL events to the Datalayer OTEL service.

See ``datalayer_core.otel.logfire`` for endpoint / auth resolution details.
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

# Enable debug logging for OTEL exporters so the CLI shows export details.
logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s")
# Suppress noisy low-level libs; keep OTEL and pydantic_ai at DEBUG.
for _noisy in ("httpcore", "httpx", "urllib3", "asyncio", "hpack"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

load_dotenv()

# Ollama base URL (can be overridden via env var).
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434/v1")

# ── Configure logfire ────────────────────────────────────────────────
# configure() sets OTEL env vars and imports logfire internally, so it must be
# called BEFORE any direct `import logfire` elsewhere in this module.

from datalayer_core.otel.logfire import configure, flush  # noqa: E402

logfire = configure(
    service_name="datalayer-otel-logfire-example",
    instrument_pydantic_ai=True,
)

# ── Run a simple pydantic_ai agent ──────────────────────────────────

from pydantic_ai import Agent  # noqa: E402

# Use local Ollama if available, otherwise fall back to a no-op echo.
_model = os.environ.get("LOGFIRE_EXAMPLE_MODEL", "ollama:gemma3:1b-it-qat")

agent = Agent(_model, instructions="Be concise, reply with one sentence.")

# Emit an explicit counter metric so it's easy to spot in the UI.
_counter = logfire.metric_counter(
    "datalayer.logfire_example.runs",
    description="Number of times the logfire example has run",
)
_counter.add(1, {"model": _model})

with logfire.span("logfire-example"):
    result = agent.run_sync('Where does "hello world" come from?')

print(result.output)

# Flush all buffered spans before the process exits.
flush()
