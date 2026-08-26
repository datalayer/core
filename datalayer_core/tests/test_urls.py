# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Where each service is, when the environment only says where some of them are."""

from datalayer_core.utils.urls import DatalayerURLs

def test_contents_follows_runtimes_not_iam(monkeypatch) -> None:
    """Contents lives on the runtimes plane, beside the NFS it serves.

    Setting `DATALAYER_IAM_URL` makes every other service inherit that host.
    Contents must not: the IAM plane runs no Contents service, so inheriting it
    pointed every client at a host that answers nothing — which reaches a
    browser as a CORS failure rather than as anything diagnosable.
    """
    monkeypatch.setenv("DATALAYER_IAM_URL", "https://iam.example")
    monkeypatch.delenv("DATALAYER_CONTENTS_URL", raising=False)
    monkeypatch.delenv("DATALAYER_RUNTIMES_URL", raising=False)

    urls = DatalayerURLs.from_environment()

    assert urls.iam_url == "https://iam.example"
    assert urls.contents_url == urls.runtimes_url
    assert urls.contents_url != urls.iam_url


def test_contents_follows_runtimes_wherever_runtimes_is_put(monkeypatch) -> None:
    """Including a plane that puts every service on one host."""
    monkeypatch.setenv("DATALAYER_IAM_URL", "https://one-host.example")
    monkeypatch.setenv("DATALAYER_RUNTIMES_URL", "https://one-host.example")
    monkeypatch.delenv("DATALAYER_CONTENTS_URL", raising=False)

    urls = DatalayerURLs.from_environment()

    assert urls.contents_url == "https://one-host.example"


def test_an_explicit_contents_url_still_wins(monkeypatch) -> None:
    monkeypatch.setenv("DATALAYER_IAM_URL", "https://iam.example")
    monkeypatch.setenv("DATALAYER_RUNTIMES_URL", "https://runtimes.example")
    monkeypatch.setenv("DATALAYER_CONTENTS_URL", "https://contents.example")

    assert DatalayerURLs.from_environment().contents_url == "https://contents.example"
