# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Integration tests for usage history across billable account scopes."""

import os
import time
import uuid
from datetime import datetime
from typing import Any
from urllib.parse import urlencode

import pytest
from dotenv import load_dotenv

from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

load_dotenv()

TEST_DATALAYER_API_KEY = os.environ.get("TEST_DATALAYER_API_KEY") or os.environ.get(
    "DATALAYER_API_KEY"
)

LOCAL_RUN_URL = os.environ.get("TEST_DATALAYER_RUN_URL", "http://localhost:9700")
LOCAL_IAM_URL = os.environ.get("TEST_DATALAYER_IAM_URL", "http://localhost:9700")
LOCAL_RUNTIMES_URL = os.environ.get(
    "TEST_DATALAYER_RUNTIMES_URL",
    "http://localhost:9500",
)


def _build_test_client() -> DatalayerClient:
    return DatalayerClient(
        token=TEST_DATALAYER_API_KEY,
        urls=DatalayerURLs.from_environment(
            run_url=LOCAL_RUN_URL,
            iam_url=LOCAL_IAM_URL,
            runtimes_url=LOCAL_RUNTIMES_URL,
        ),
    )


def _parse_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _iam_get_json(client: DatalayerClient, path: str) -> dict[str, Any]:
    response = client._fetch(f"{client.urls.iam_url}{path}")
    payload = response.json()
    if not payload.get("success", True):
        raise RuntimeError(payload.get("message", f"Request failed for path {path}"))
    return payload


def _resolve_billable_accounts(client: DatalayerClient) -> dict[str, dict[str, str]]:
    whoami_payload = _iam_get_json(client, "/api/iam/v1/whoami")
    profile = whoami_payload.get("profile") or {}
    if not profile.get("uid"):
        raise RuntimeError("Unable to resolve authenticated user profile uid")

    memberships_payload = _iam_get_json(client, "/api/iam/v1/memberships")
    memberships = memberships_payload.get("memberships") or []

    first_team = next(
        (m for m in memberships if str(m.get("type") or "").lower() == "team"),
        None,
    )
    datalayer_org = next(
        (
            m
            for m in memberships
            if str(m.get("type") or "").lower() == "organization"
            and str(m.get("handle") or "").lower() == "datalayer"
        ),
        None,
    )

    accounts: dict[str, dict[str, str]] = {
        "user": {
            "uid": str(profile["uid"]),
            "kind": "user",
            "handle": str(profile.get("handle") or ""),
        }
    }

    if first_team and first_team.get("uid"):
        accounts["team"] = {
            "uid": str(first_team["uid"]),
            "kind": "team",
            "handle": str(first_team.get("handle") or ""),
        }

    if datalayer_org and datalayer_org.get("uid"):
        accounts["datalayer"] = {
            "uid": str(datalayer_org["uid"]),
            "kind": "organization",
            "handle": str(datalayer_org.get("handle") or "datalayer"),
        }

    return accounts


def _fetch_usage_history(
    client: DatalayerClient,
    account_uid: str,
    account_kind: str,
) -> list[dict[str, Any]]:
    query: dict[str, str] = {
        "billable_account_uid": account_uid,
    }
    # API currently recognizes only user|organization kinds.
    if account_kind in {"user", "organization"}:
        query["billable_account_kind"] = account_kind

    payload = _iam_get_json(
        client,
        f"/api/iam/v1/usage/user?{urlencode(query)}",
    )
    return payload.get("usages") or []


def _find_usage_row(usages: list[dict[str, Any]], runtime_uid: str) -> dict[str, Any] | None:
    for usage in usages:
        if str(usage.get("resource_uid") or "") == runtime_uid:
            return usage
    return None


def _wait_for_usage_row(
    client: DatalayerClient,
    account_uid: str,
    account_kind: str,
    runtime_uid: str,
    expect_closed: bool,
    timeout_seconds: int = 240,
    poll_seconds: int = 5,
) -> dict[str, Any]:
    deadline = time.time() + timeout_seconds
    last_seen: dict[str, Any] | None = None

    while time.time() < deadline:
        usages = _fetch_usage_history(client, account_uid, account_kind)
        row = _find_usage_row(usages, runtime_uid)
        if row is not None:
            last_seen = row
            has_end_date = bool(row.get("end_date"))
            if expect_closed == has_end_date:
                return row
        time.sleep(poll_seconds)

    state = "closed" if expect_closed else "open"
    raise AssertionError(
        f"Timed out waiting for {state} usage row for runtime={runtime_uid}. Last seen={last_seen}"
    )


@pytest.mark.parametrize("account_case", ["user", "team", "datalayer"])
@pytest.mark.skipif(
    not bool(TEST_DATALAYER_API_KEY),
    reason="TEST_DATALAYER_API_KEY is not set, skipping usage integration tests.",
)
def test_usage_matrix_creation_reservation_and_history(account_case: str) -> None:
    """
    Validate usage lifecycle with a 1-minute reservation and manual stop at ~30s.

    Matrix:
    - user billable account
    - team billable account
    - datalayer organization billable account

    Coverage:
    - runtime creation
    - active reservation/open usage row while running
    - closed usage history row after manual stop
    """
    client = _build_test_client()
    accounts = _resolve_billable_accounts(client)

    if account_case not in accounts:
        pytest.skip(f"No available account for case={account_case}")

    account = accounts[account_case]
    runtime = None

    runtime_name = f"test_usage_{account_case}_{uuid.uuid4().hex[:8]}"

    try:
        runtime = client.create_runtime(
            name=runtime_name,
            time_reservation=1,
            billable_account_uid=account["uid"],
            billable_account_type=account["kind"],
            billable_account_handle=account["handle"] or None,
        )

        # Creation coverage.
        assert runtime.pod_name, "Runtime pod_name should be set after creation"
        assert runtime.reservation_id, "Runtime reservation_id should be present"

        # Reservation coverage: usage row should be open while runtime is running.
        open_usage = _wait_for_usage_row(
            client=client,
            account_uid=account["uid"],
            account_kind=account["kind"],
            runtime_uid=runtime.pod_name,
            expect_closed=False,
            timeout_seconds=180,
        )
        assert not open_usage.get("end_date"), "Expected open usage row while runtime is running"

        # Manual stop after ~30 seconds for a 1-minute reservation scenario.
        stop_wait_start = time.monotonic()
        time.sleep(30)
        stop_wait_elapsed = time.monotonic() - stop_wait_start
        assert client.terminate_runtime(runtime), "Runtime termination should succeed"
        assert stop_wait_elapsed >= 25, (
            f"Expected to wait about 30s before manual stop, got {stop_wait_elapsed:.2f}s"
        )

        # Usage history coverage: same runtime row should close with end_date set.
        closed_usage = _wait_for_usage_row(
            client=client,
            account_uid=account["uid"],
            account_kind=account["kind"],
            runtime_uid=runtime.pod_name,
            expect_closed=True,
            timeout_seconds=240,
        )
        assert closed_usage.get("end_date"), "Expected closed usage row after manual stop"

        # Usage history timestamps can be rounded to seconds and occasionally collapse
        # to the same second; keep checks robust to that backend behavior.
        start_dt = _parse_timestamp(closed_usage.get("start_date"))
        end_dt = _parse_timestamp(closed_usage.get("end_date"))
        assert start_dt is not None and end_dt is not None, "Usage start/end timestamps must be parseable"
        duration_seconds = (end_dt - start_dt).total_seconds()
        assert duration_seconds >= 0, (
            f"Expected non-negative usage duration, got {duration_seconds:.2f}s"
        )
        assert duration_seconds <= 90, (
            f"Expected usage duration to remain bounded for a 1-minute reservation, got {duration_seconds:.2f}s"
        )

    finally:
        if runtime is not None and runtime.pod_name:
            # Best-effort cleanup for flaky failures.
            try:
                client.terminate_runtime(runtime)
            except Exception:
                pass
