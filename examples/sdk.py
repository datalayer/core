# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from dotenv import load_dotenv

from datalayer_core import DatalayerClient

# Using .env file with DATALAYER_RUN_URL and DATALAYER_TOKEN defined
load_dotenv()

client = DatalayerClient()
if client.authenticate():
    print("creating runtime:")
    with client.create_runtime() as runtime:
        code = """import os
from platform import node
print(f"Hey {os.environ.get('USER', 'John Smith')} from {node()}.")
"""
        result = runtime.execute(code)
        print(result)

    created_secret = client.create_secret(
        name="my_secret_2",
        description="This is a test secret",
        value="super_secret_value",
    )
    print("created:", created_secret)
    secrets = client.list_secrets()

    print("list:")
    for secret in secrets:
        print(secret)

    print("delete:")
    client.delete_secret(created_secret)

    print("list:")
    secrets = client.list_secrets()
    for secret in secrets:
        print(secret)
