# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import csv

from datalayer_core.evals.report import _write_report_csv


def test_write_report_csv_includes_usage_columns_and_values(tmp_path):
    report = {
        "evalset_id": "evalset-1",
        "run_environment": "ui",
        "generated_at": "2026-06-20T00:00:00Z",
        "experiments": [
            {
                "id": "exp-1",
                "name": "Experiment One",
                "agent_spec_id": "agent-1",
                "agent_spec_name": "Agent One",
                "runs_fetched": 1,
                "runs_total": 1,
                "baseline_pass_rate": 1.0,
                "latest_pass_rate": 1.0,
                "drift_delta": 0.0,
                "latest_two_delta": 0.0,
                "mean_pass_rate": 1.0,
                "stddev_pass_rate": 0.0,
                "runs": [
                    {
                        "id": "run-1",
                        "status": "completed",
                        "pass_rate": 1.0,
                        "failure_cause": {},
                        "metrics": {
                            "pydantic_ai_usage": {
                                "source": "reconciled",
                                "provider": "openai",
                                "model": "gpt-test",
                                "requests": 2,
                                "prompt_tokens": 100,
                                "completion_tokens": 20,
                                "total_tokens": 120,
                                "credits_consumed": 0.15,
                            },
                            "case_results": [
                                {
                                    "name": "case-1",
                                    "passed": True,
                                    "score": 1.0,
                                    "category": "basic",
                                    "difficulty": "easy",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
        "evaluator_results": [],
    }

    output_path = tmp_path / "report.csv"
    _write_report_csv(report, output_path)

    with output_path.open("r", encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))

    assert rows

    run_row = next(row for row in rows if row.get("row_type") == "run")
    case_row = next(row for row in rows if row.get("row_type") == "case")

    assert run_row["usage_source"] == "reconciled"
    assert run_row["usage_provider"] == "openai"
    assert run_row["usage_model"] == "gpt-test"
    assert run_row["usage_requests"] == "2"
    assert run_row["usage_prompt_tokens"] == "100"
    assert run_row["usage_completion_tokens"] == "20"
    assert run_row["usage_total_tokens"] == "120"
    assert run_row["usage_credits_consumed"] == "0.15"

    assert case_row["usage_total_tokens"] == "120"
    assert case_row["usage_provider"] == "openai"


def test_write_report_csv_falls_back_to_report_usage_when_metrics_usage_missing(tmp_path):
    report = {
        "evalset_id": "evalset-1",
        "run_environment": "ui",
        "generated_at": "2026-06-20T00:00:00Z",
        "experiments": [
            {
                "id": "exp-1",
                "name": "Experiment One",
                "agent_spec_id": "agent-1",
                "agent_spec_name": "Agent One",
                "runs_fetched": 1,
                "runs_total": 1,
                "baseline_pass_rate": 1.0,
                "latest_pass_rate": 1.0,
                "drift_delta": 0.0,
                "latest_two_delta": 0.0,
                "mean_pass_rate": 1.0,
                "stddev_pass_rate": 0.0,
                "runs": [
                    {
                        "id": "run-1",
                        "status": "completed",
                        "pass_rate": 1.0,
                        "failure_cause": {},
                        "metrics": {
                            "case_results": [
                                {
                                    "name": "case-1",
                                    "passed": True,
                                    "score": 1.0,
                                    "category": "basic",
                                    "difficulty": "easy",
                                }
                            ],
                        },
                        "report": {
                            "usage": {
                                "pydantic_ai_usage": {
                                    "source": "reconciled",
                                    "provider": "openai",
                                    "model": "gpt-test",
                                    "requests": 2,
                                    "prompt_tokens": 100,
                                    "completion_tokens": 20,
                                    "total_tokens": 120,
                                    "credits_consumed": 0.15,
                                }
                            }
                        },
                    }
                ],
            }
        ],
        "evaluator_results": [],
    }

    output_path = tmp_path / "report.csv"
    _write_report_csv(report, output_path)

    with output_path.open("r", encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))

    run_row = next(row for row in rows if row.get("row_type") == "run")
    case_row = next(row for row in rows if row.get("row_type") == "case")

    assert run_row["usage_source"] == "reconciled"
    assert run_row["usage_total_tokens"] == "120"
    assert run_row["usage_credits_consumed"] == "0.15"
    assert case_row["usage_provider"] == "openai"
