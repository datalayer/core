# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path

from dotenv import load_dotenv

from datalayer_core import DatalayerClient

load_dotenv()

HERE = Path(__file__).parent
SNAPSHOT_NAME = "snapshot-streamlit-model"

client = DatalayerClient()
with client.create_runtime(name="runtime-fast-api-sklearn-example") as runtime:
    response = runtime.execute_file(HERE / "train.py")
    snapshot = runtime.create_snapshot(
        name=SNAPSHOT_NAME,
        description="Snapshot of the sklearn trained iris model",
        stop=False,
    )
