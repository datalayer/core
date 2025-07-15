# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from dotenv import load_dotenv

from datalayer_core import DatalayerClient

# Using .env file with DATALAYER_RUN_URL and DATALAYER_TOKEN defined
load_dotenv()

client = DatalayerClient()
if client.authenticate():
    with client.create_runtime() as runtime:
        code = """import os
from platform import node
print(f"Hey {os.environ.get('USER', 'John Smith')} from {node()}.")
"""
        result = runtime.execute(code)
        print(result)
