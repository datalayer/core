# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import os
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

        assert client.list_runtimes() == 1


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_runtime_snapshot_creation():
    """
    Test the creation and deletion of runtime.
    """
    # Create a secret
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    runtime_name = f"test_runtime-{uuid.uuid4()}"
    smnapshot_name = f"test_snapshot-{uuid.uuid4()}"
    with client.create_runtime(name=runtime_name) as runtime:
        snapshot = runtime.create_snapshot(name=smnapshot_name, stop=False)
        assert snapshot.name == smnapshot_name


@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_environments_list():
    client = DatalayerClient(token=DATALAYER_TEST_TOKEN)
    envs = client.list_environments()
    assert len(envs) == 2
