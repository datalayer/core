# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The Datasource query and Dataserver registration records of Contents.

The models are the generated ones, re-exported under this name; what this
module adds is what the contract does not define — the unions as standalone
types, the operations a form lists, and which query statuses are terminal:

- a *Datasource* is a connection to a database, warehouse or query service,
  reached directly or through a Dataserver. Its credential stays with
  Contents — a test, a schema discovery or a query is asked of the service,
  never of the database;
- a *query* is an asynchronous job: submitted, then polled to ``succeeded``,
  ``failed`` or ``cancelled``. Its result is Arrow IPC bytes, streamed by
  range, and a result can be saved as a Dataset revision rather than kept in
  the answer;
- a *Dataserver* is a gateway in a customer network. Its ``status`` is a
  heartbeat lease and the connectors it advertises; ``drain``, ``resume``
  and ``revoke`` move its state; its mTLS identity is issued and rotated
  from a CSR, and the private key never comes this way.
"""

from __future__ import annotations

from typing import Literal

from .generated import (
    CapabilityTicket,
    CapabilityTicketRequest,
    CertificateSigningRequest,
    DataServerConnectivity,
    DataServerConnector,
    DataServerStatus,
    DatasourceCapabilities,
    DatasourceColumn,
    DatasourceQuery,
    DatasourceQueryCreate,
    DatasourceQueryList,
    DatasourceSchema,
    DatasourceTable,
    DatasourceTest,
    FlightConnectivity,
    HttpsConnectivity,
    IssuedIdentity,
    QueryError,
    QueryResultReference,
    QuerySave,
)

ConnectorType = Literal["athena", "bigquery", "sql"]
NetworkRoute = Literal["direct", "dataserver"]
DatasourceOperation = Literal["select", "describe", "list"]
QueryStatus = Literal["pending", "running", "succeeded", "failed", "cancelled"]
DataserverState = Literal[
    "registering", "ready", "degraded", "unavailable", "draining", "revoked"
]

#: A query the service has finished with, one way or another.
QUERY_TERMINAL_STATUSES: frozenset[str] = frozenset(
    {"succeeded", "failed", "cancelled"}
)

#: The operations a Datasource may allow, in the order a form lists them.
DATASOURCE_OPERATIONS: tuple[str, ...] = ("select", "describe", "list")


def is_query_terminal(query: DatasourceQuery) -> bool:
    return query.status in QUERY_TERMINAL_STATUSES


__all__ = [
    "DATASOURCE_OPERATIONS",
    "QUERY_TERMINAL_STATUSES",
    "CapabilityTicket",
    "CapabilityTicketRequest",
    "CertificateSigningRequest",
    "ConnectorType",
    "DataServerConnectivity",
    "DataServerConnector",
    "DataServerStatus",
    "DataserverState",
    "DatasourceCapabilities",
    "DatasourceColumn",
    "DatasourceOperation",
    "DatasourceQuery",
    "DatasourceQueryCreate",
    "DatasourceQueryList",
    "DatasourceSchema",
    "DatasourceTable",
    "DatasourceTest",
    "FlightConnectivity",
    "HttpsConnectivity",
    "IssuedIdentity",
    "NetworkRoute",
    "QueryError",
    "QueryResultReference",
    "QuerySave",
    "QueryStatus",
    "is_query_terminal",
]
