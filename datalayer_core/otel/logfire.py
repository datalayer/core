# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Helpers for configuring `logfire` to export telemetry to the Datalayer OTEL service.

Usage (call `configure()` **before** any `import logfire` in the caller's module)::

    from datalayer_core.otel.logfire import configure, flush

    logfire = configure(
        service_name="my-service",
        instrument_pydantic_ai=True,
    )

    with logfire.span("my-span"):
        ...

    flush()  # call before process exit to ensure all spans are exported

The OTLP endpoint is resolved with the same priority as ``generator.py``:

1. ``DATALAYER_OTLP_URL``              — explicit full base URL
2. ``DATALAYER_OTEL_RUN_URL``          — run URL, appends ``/api/otel/v1/otlp``
3. ``DATALAYER_RUN_URL``               — fallback run URL, appends ``/api/otel/v1/otlp``
4. ``https://prod1.datalayer.run``     — production default

Authentication reads ``DATALAYER_API_KEY`` as a Bearer token.  The JWT payload is
decoded to extract the caller's ``user_uid`` which is injected as an OTEL resource
attribute (``datalayer.user_uid``) so the backend can associate spans with the
authenticated account.

.. note::
    This module intentionally does **not** import ``logfire`` at the top level.
    ``configure()`` sets the required ``OTEL_EXPORTER_OTLP_*`` environment variables
    and *then* imports + initialises logfire so that its internal SDK picks them up.
    Any ``import logfire`` in the caller's module must therefore come *after* calling
    ``configure()``, or the caller should use the return value of ``configure()``.
"""

from __future__ import annotations

import base64
import json
import logging
import os

_log = logging.getLogger(__name__)

# ── Exported names ──────────────────────────────────────────────────

__all__ = ["otlp_endpoint", "decode_user_uid", "setup_env", "configure", "flush"]


# ── Helpers ─────────────────────────────────────────────────────────

def otlp_endpoint() -> str:
    """Return the resolved OTLP base URL (no trailing ``/v1/traces`` suffix)."""
    explicit = os.environ.get("DATALAYER_OTLP_URL")
    if explicit:
        return explicit.rstrip("/")
    run_url = (
        os.environ.get("DATALAYER_OTEL_RUN_URL")
        or os.environ.get("DATALAYER_RUN_URL")
        or "https://prod1.datalayer.run"
    )
    return run_url.rstrip("/") + "/api/otel/v1/otlp"


def decode_user_uid(token: str) -> str | None:
    """Extract the Datalayer ``user_uid`` from a JWT *token* string.

    Returns ``None`` if the token is malformed or the claim is missing.
    """
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        user_claim = payload.get("user")
        if isinstance(user_claim, dict) and user_claim.get("uid"):
            return str(user_claim["uid"])
        sub = payload.get("sub")
        if isinstance(sub, str) and sub:
            return sub
    except Exception as exc:  # noqa: BLE001
        _log.warning("Could not decode user_uid from token: %s", exc)
    return None


def setup_env(token: str | None = None) -> str:
    """Set ``OTEL_EXPORTER_OTLP_*`` and ``OTEL_RESOURCE_ATTRIBUTES`` env vars.

    This **must** be called before ``import logfire`` so logfire's internal SDK
    reads the correct values.

    Parameters
    ----------
    token:
        Datalayer API key (Bearer token). Defaults to ``DATALAYER_API_KEY``.

    Returns
    -------
    str
        The resolved OTLP base endpoint that was written to the environment.
    """
    endpoint = otlp_endpoint()
    if not token:
        token = os.environ.get("DATALAYER_API_KEY", "")

    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = endpoint
    if token:
        # Space in "Bearer <token>" must be URL-encoded; plain spaces are rejected
        # by some OTLP receivers when sent as a header value in env-var form.
        os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer%20{token}"

    # Inject user_uid as a resource attribute for backend account association.
    user_uid = (token and decode_user_uid(token)) or os.environ.get("DATALAYER_USER_UID")
    if user_uid:
        existing = os.environ.get("OTEL_RESOURCE_ATTRIBUTES", "")
        extra = f"datalayer.user_uid={user_uid}"
        os.environ["OTEL_RESOURCE_ATTRIBUTES"] = f"{existing},{extra}" if existing else extra
        _log.info("OTEL resource attribute: datalayer.user_uid=%s", user_uid)
    else:
        _log.warning("No user_uid resolved – spans will not be associated with your account")

    _log.info("OTLP export endpoint: %s", endpoint)
    return endpoint


def configure(
    service_name: str = "datalayer-service",
    *,
    instrument_pydantic_ai: bool = False,
    token: str | None = None,
) -> object:
    """Configure logfire to ship telemetry to the Datalayer OTEL service.

    Sets up the required ``OTEL_EXPORTER_OTLP_*`` env vars, then imports and
    initialises ``logfire`` with ``send_to_logfire=False`` so that the standard
    OTLP exporter is used exclusively.

    Parameters
    ----------
    service_name:
        OTEL ``service.name`` resource attribute.
    instrument_pydantic_ai:
        When ``True``, calls ``logfire.instrument_pydantic_ai()`` automatically.
    token:
        Datalayer API key. Falls back to ``DATALAYER_API_KEY`` env var.

    Returns
    -------
    module
        The configured ``logfire`` module, ready to use.
    """
    setup_env(token=token)

    # Import AFTER env vars are set so logfire's SDK sees them at initialisation.
    import logfire as _logfire  # noqa: PLC0415

    _logfire.configure(
        service_name=service_name,
        send_to_logfire=False,
    )

    if instrument_pydantic_ai:
        _logfire.instrument_pydantic_ai()

    return _logfire


def flush() -> None:
    """Flush and shut down the active tracer provider.

    Call this at the end of short-lived scripts to ensure all buffered spans are
    exported before the process exits.  Safe to call even if ``configure()`` was
    never invoked (it will be a no-op in that case).
    """
    from opentelemetry import trace as _trace  # noqa: PLC0415

    provider = _trace.get_tracer_provider()
    _log.debug("Flushing tracer provider: %s", type(provider).__name__)
    try:
        provider.force_flush()
        provider.shutdown()
    except Exception as exc:  # noqa: BLE001
        _log.warning("Error during tracer provider flush/shutdown: %s", exc)
