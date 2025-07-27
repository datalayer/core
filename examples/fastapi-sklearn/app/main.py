# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from models import Iris
from sklearn.datasets import load_iris

from datalayer_core import DatalayerClient

load_dotenv()

HERE = Path(__file__).parent
SNAPSHOT_NAME = "snapshot-iris-model"
IRIS_NAMES = load_iris().target_names
app = FastAPI()


@app.get("/")
def home():  # type: ignore
    return {"message": "Welcome to the Iris Prediction API!"}


@app.post("/predict")
def predict_species(data: Iris):  # type: ignore
    client = DatalayerClient()
    with client.create_runtime(snapshot_name=SNAPSHOT_NAME) as runtime:
        runtime.execute(HERE / "models.py")
        runtime.execute(HERE / "scripts/predict.py", variables=data.model_dump())
        prediction = runtime.get_variable("prediction")
        return {"predicted_species": IRIS_NAMES[prediction]}
