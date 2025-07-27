# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.
import inspect

from dotenv import load_dotenv

from datalayer_core import DatalayerClient
from datalayer_core.sdk.decorators import datalayer

# Using .env file with DATALAYER_RUN_URL and DATALAYER_TOKEN defined
load_dotenv()


# @datalayer
# @datalayer()
# @datalayer(runtime_name="example-runtime")
@datalayer(snapshot_name="snapshot-iris-model")
# @datalayer(runtime_name="example-runtime", output="result")
# @datalayer(runtime_name="example-runtime", inputs=["a", "b", "c"])
def sum(x: float, y: float, z: int = 1) -> float:
    return x + y


print([sum(1, 4.5, z=2)])

# sig = inspect.signature(example)
# print("\nParameters:")
# for name, param in sig.parameters.items():
#     print(f"  Name: {name}")
#     print(f"  Kind: {param.kind}")
#     print(f"  Default Value: {param.default}")
#     print(f"  Annotation: {param.annotation}")
#     print("---")

# print(client.list_runtimes())
# with client.create_runtime() as runtime:
#     runtime.execute('x = 1')
#     runtime.execute('y = 4.5')
#     runtime.execute('def example(x: float, y: float) -> float:\n    return x + y\n')
#     runtime.execute('print(example(x, y))')
#     response = runtime.execute("import os;print(len(os.environ['MY_SECRET']))")
#     print(response.stdout)
#     response = runtime.execute(
#         'from platform import node;print(f"Hello world! from {node()}.")'
#     )
#     print(response.stdout)
#     snapshot = runtime.create_snapshot(stop=False)
#     print(snapshot)


# created_secret = client.create_secret(
#     name="my_secret_2",
#     description="This is a test secret",
#     value="super_secret_value",
# )
# print("created:", created_secret)
# secrets = client.list_secrets()

# print("list:")
# for secret in secrets:
#     print(secret)

# print("delete:")
# client.delete_secret(created_secret)

# print("list:")
# secrets = client.list_secrets()
# for secret in secrets:
#     print(secret)

# snapshots = client.list_snapshots()
# for s in snapshots:
#     print(s.name)
