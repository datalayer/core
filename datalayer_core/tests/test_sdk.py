# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import os
import time
import uuid

import pytest
from dotenv import load_dotenv

from datalayer_core import DatalayerClient

load_dotenv()


DATALAYER_TEST_TOKEN = os.environ.get("DATALAYER_TEST_TOKEN")


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_secrets_creation_list_delete():
    """
    Test the creation and deletion of secrets.
    """
    # Create a secret
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    secret_name = f"test_secret-{uuid.uuid4()}"
    created_secret = client.create_secret(
        name=secret_name,
        description="Test Secret",
        value="secret_value",
    )
    assert created_secret.name == secret_name
    assert created_secret.description == "Test Secret"

    # Check it was created
    secrets = client.list_secrets()
    for s in secrets:
        if s.uid == created_secret.uid:
            assert s.name == secret_name
            assert s.description == "Test Secret"
            break
    else:
        pytest.fail("Created secret not found in the list of secrets.")

    # Delete the secret
    client.delete_secret(created_secret.uid)

    # Check it was deleted
    secrets = client.list_secrets()
    for s in secrets:
        if s.uid == created_secret.uid:
            pytest.fail("Created secret not found in the list of secrets.")


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_secrets_delete_non_existent():
    """
    Test the creation and deletion of secrets.
    """
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)

    # Delete the secret
    response = client.delete_secret(uuid.uuid4())
    assert response.get("success") is False


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_runtime_create_execute_and_list():
    """
    Test the creation and deletion of runtime.
    """
    # Create a secret
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    runtime_name = f"test_runtime-{uuid.uuid4()}"
    with client.create_runtime(name=runtime_name) as runtime:
        assert runtime.name == runtime_name
        assert runtime.uid is not None

        # Execute a command
        response = runtime.execute("print('test')")
        assert response.stdout.strip() == "test"

        assert len(client.list_runtimes()) == 1


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_runtime_snapshot_create_and_delete():
    """
    Test the creation and deletion of runtime.
    """
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    runtime_name = f"test_runtime-{uuid.uuid4()}"
    snapshot_name = f"test_snapshot-{uuid.uuid4()}"
    snapshot_name_2 = f"test_snapshot-{uuid.uuid4()}"
    snapshot_name_3 = f"test_snapshot-{uuid.uuid4()}"
    with client.create_runtime(name=runtime_name) as runtime:
        snapshot = runtime.create_snapshot(name=snapshot_name, stop=False)
        assert snapshot.name == snapshot_name
        snapshot_2 = client.create_snapshot(
            runtime=runtime, name=snapshot_name_2, stop=False
        )
        assert snapshot_2.name == snapshot_name_2
        snapshot_3 = client.create_snapshot(
            pod_name=runtime.pod_name, name=snapshot_name_3, stop=False
        )
        assert snapshot_3.name == snapshot_name_3

        time.sleep(5)

        assert client.delete_snapshot(snapshot)["success"]
        assert client.delete_snapshot(snapshot_2)["success"]
        assert client.delete_snapshot(snapshot_3)["success"]


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_environments_list():
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    envs = client.list_environments()
    assert len(envs) == 2


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_authenticate():
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    print(client._log_in())
    assert client.authenticate()
