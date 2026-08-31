# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""What the SDK actually puts on the wire.

The CLI tests run against a fake client, so they prove the command passes
what it was given — not that the method turns it into the right request. This
is the other half, and it matters most where a falsy value is a real one: an
empty string is a destination somebody removed, and a method that dropped it
would leave that destination receiving.

Launch the tests:
```
$ pytest datalayer_core/tests/test_mcp_mixin.py -v
```
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from datalayer_core.mixins.mcp import McpMixin


class Recorder(McpMixin):
    """The mixin over a `_fetch` that records rather than sends."""

    def __init__(self) -> None:
        self.sent: dict[str, Any] = {}

    def _iam_url(self, suffix: str) -> str:
        return f"https://iam.test/api/iam/v1{suffix}"

    def _mcp_url(self, suffix: str) -> str:
        return f"https://mcp.test/api/mcp/v1{suffix}"

    def _fetch(self, url: str, method: str = "GET", json: Any = None, **kwargs: Any):
        self.sent = {"url": url, "method": method, "json": json}
        return SimpleNamespace(json=lambda: {"settings": {}, "success": True}, content=b"{}")


@pytest.fixture
def sdk() -> Recorder:
    return Recorder()


class TestAlertDestinations:
    def test_only_what_was_passed_is_sent(self, sdk) -> None:
        """IAM merges this document. Retention and SIEM forwarding live on it
        too, set by other people — sending the whole shape would clear
        them."""
        sdk.set_mcp_alert_destinations("01ORG", emails="ops@example.co")
        assert sdk.sent["json"] == {"alert_emails": "ops@example.co"}

    def test_a_cleared_destination_is_sent_rather_than_dropped(self, sdk) -> None:
        """An empty string is a decision. Dropped, it is a destination
        somebody removed that keeps receiving."""
        sdk.set_mcp_alert_destinations("01ORG", webhook="")
        assert sdk.sent["json"] == {"alert_webhook_url": ""}

    def test_slack_is_its_own_field(self, sdk) -> None:
        sdk.set_mcp_alert_destinations("01ORG", slack="https://hooks.slack.com/x")
        assert sdk.sent["json"] == {"alert_slack_webhook_url": "https://hooks.slack.com/x"}

    def test_all_three_at_once(self, sdk) -> None:
        sdk.set_mcp_alert_destinations("01ORG", webhook="w", slack="s", emails="e")
        assert set(sdk.sent["json"]) == {
            "alert_webhook_url",
            "alert_slack_webhook_url",
            "alert_emails",
        }


class TestThePolicyLayer:
    def test_a_write_carries_the_version_as_a_query(self, sdk) -> None:
        sdk.set_mcp_policy_layer("organization", "01ORG", {"maxCallsPerMinute": 30}, expected_version=7)
        assert "expected_version=7" in sdk.sent["url"]

    def test_a_version_of_zero_is_carried_rather_than_dropped(self, sdk) -> None:
        """Falsy and real. Dropped, the write stops being conditional and
        silently overwrites."""
        sdk.set_mcp_policy_layer("organization", "01ORG", {}, expected_version=0)
        assert "expected_version=0" in sdk.sent["url"]

    def test_no_version_sends_none(self, sdk) -> None:
        """A layer nobody has written has no version, and inventing one
        would make the first write of every policy a conflict."""
        sdk.set_mcp_policy_layer("organization", "01ORG", {})
        assert "expected_version" not in sdk.sent["url"]

    def test_the_rules_are_the_body(self, sdk) -> None:
        sdk.set_mcp_policy_layer("personal", "01USER", {"toolDenylist": ["execute_cell"]})
        assert sdk.sent["json"] == {"toolDenylist": ["execute_cell"]}

    def test_a_layer_is_addressed_by_scope_and_subject(self, sdk) -> None:
        sdk.set_mcp_policy_layer("team", "01TEAM", {})
        assert "/mcp-policies/team/01TEAM" in sdk.sent["url"]


class TestTryingARule:
    def test_it_asks_the_gateway_not_iam(self, sdk) -> None:
        """IAM holds the rule and has nothing to read it with."""
        sdk.test_mcp_alert_rule({"condition": "tasks.open", "threshold": 1})
        assert "mcp.test" in sdk.sent["url"]
        assert sdk.sent["method"] == "POST"
