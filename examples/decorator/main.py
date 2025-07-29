# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer decorator example demonstrating function execution in remote runtimes."""

import time
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

from datalayer_core.sdk.decorators import datalayer

load_dotenv()

HERE = Path(__file__).parent


# Example 1: Simple function with decorator
@datalayer(runtime_name="my-runtime", environment="ai-env")
def simple_computation(x: int, y: int) -> int:
    """
    Simple computation that runs on a remote runtime.

    Parameters
    ----------
    x : int
        First integer value for computation.
    y : int
        Second integer value for computation.

    Returns
    -------
    int
        Result of x * y + 10.
    """
    result = x * y + 10
    print(f"Computing {x} * {y} + 10 = {result}")
    return result


# Example 2: Function with inputs and output variables
@datalayer(
    runtime_name="data-processing",
    environment="ai-env",
    inputs=["data"],
    output="processed_result",
)
def process_data(data: list[float]) -> dict:
    """
    Process data and return statistics.

    Parameters
    ----------
    data : list
        List of numerical values to process.

    Returns
    -------
    dict
        Dictionary containing statistical measures of the data.
    """
    import statistics

    processed_result = {
        "count": len(data),
        "mean": statistics.mean(data),
        "median": statistics.median(data),
        "stdev": statistics.stdev(data) if len(data) > 1 else 0,
        "min": min(data),
        "max": max(data),
    }

    print(f"Processed {len(data)} data points")
    print(f"Statistics: {processed_result}")

    return processed_result


# Example 3: Machine learning example
@datalayer(
    runtime_name="ml-training",
    environment="ai-env",
    inputs=["features", "labels"],
    output="model_metrics",
    debug=True,
)
def train_simple_model(features: list[float], labels: list[float]) -> dict:
    """
    Train a simple machine learning model.

    Parameters
    ----------
    features : list
        List of feature values for training.
    labels : list
        List of target labels corresponding to features.

    Returns
    -------
    dict
        Dictionary containing model performance metrics.
    """
    import numpy as np
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_squared_error, r2_score
    from sklearn.model_selection import train_test_split

    # Convert to numpy arrays
    X = np.array(features).reshape(-1, 1)
    y = np.array(labels)

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train the model
    model = LinearRegression()
    model.fit(X_train, y_train)

    # Make predictions
    y_pred = model.predict(X_test)

    # Calculate metrics
    model_metrics = {
        "mse": float(mean_squared_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
        "coefficient": float(model.coef_[0]),
        "intercept": float(model.intercept_),
        "train_size": len(X_train),
        "test_size": len(X_test),
    }

    print(f"Model trained with R� score: {model_metrics['r2']:.3f}")
    print(f"Mean Squared Error: {model_metrics['mse']:.3f}")

    return model_metrics


# Example 4: Data analysis
@datalayer(
    runtime_name="analysis-runtime",
    environment="ai-env",
    timeout=30.0,
)
def analyze_dataset() -> dict:
    """
    Analyze a dataset and return insights.

    Returns
    -------
    dict
        Dictionary containing dataset analysis results and statistics.
    """
    import numpy as np
    import pandas as pd

    # Generate sample data
    np.random.seed(42)
    data = {
        "feature_1": np.random.normal(50, 15, 1000),
        "feature_2": np.random.exponential(2, 1000),
        "feature_3": np.random.uniform(0, 100, 1000),
        "target": np.random.normal(75, 20, 1000),
    }

    df = pd.DataFrame(data)

    # Perform analysis
    analysis_results = {
        "dataset_shape": df.shape,
        "missing_values": df.isnull().sum().to_dict(),
        "descriptive_stats": df.describe().to_dict(),
        "correlations": df.corr()["target"].drop("target").to_dict(),
    }

    print("Dataset Analysis Complete")
    print(f"Shape: {analysis_results['dataset_shape']}")
    print(f"Correlations with target: {analysis_results['correlations']}")

    return analysis_results


if __name__ == "__main__":
    print("Datalayer Decorator Examples")
    print("=" * 40)

    # Example 1: Simple computation
    print("\n1. Simple Computation Example")
    print("-" * 30)
    result1 = simple_computation(5, 8)
    print(f"Result: {result1}")

    time.sleep(10)

    # Example 2: Data processing
    print("\n2. Data Processing Example")
    print("-" * 30)
    sample_data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25]
    result2 = process_data(sample_data)
    print(f"Processing result: {result2}")

    time.sleep(10)

    # Example 3: Machine learning
    print("\n3. Machine Learning Example")
    print("-" * 30)
    # Generate sample training data (simple linear relationship)
    sample_features = list(range(1, 101))  # Features: 1 to 100
    sample_labels = [
        2 * x + 1 + np.random.normal(0, 5) for x in sample_features
    ]  # y = 2x + 1 + noise

    result3 = train_simple_model(sample_features, sample_labels)
    print(f"Model metrics: {result3}")

    time.sleep(10)

    # Example 4: Data analysis
    print("\n4. Data Analysis Example")
    print("-" * 30)
    result4 = analyze_dataset()
    print(f"Analysis complete. Dataset shape: {result4['dataset_shape']}")

    print("\n" + "=" * 40)
    print("All examples completed successfully!")
