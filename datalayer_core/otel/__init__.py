# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer OTEL client – query traces, metrics, and logs from the Datalayer OTEL service."""

from datalayer_core.otel.client import OtelClient
from datalayer_core.otel.emitter import OTelEmitter

__all__ = ["OtelClient", "OTelEmitter"]
