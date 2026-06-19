# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Evals shared package."""

from datalayer_core.evals.evals import (
    build_eval_report,
    load_evalset_spec,
    make_client,
    merge_dicts,
    now_iso,
    parse_json_file,
    parse_json_value,
    render_eval_report_markdown,
    resolve_billable_account_uid,
    timestamp_slug,
    watch_runs,
    write_eval_report_csv,
    write_eval_reports,
)
from datalayer_core.evals.evaluators import (
    evaluate_evalset,
    evaluate_run,
    run_and_evaluate_evalset,
    run_case_evaluators,
)
from datalayer_core.evals.report import (
    average_latest_pass_rate,
    collect_report_failures,
    iter_report_runs,
)

__all__ = [
    "average_latest_pass_rate",
    "build_eval_report",
    "collect_report_failures",
    "evaluate_evalset",
    "evaluate_run",
    "iter_report_runs",
    "load_evalset_spec",
    "make_client",
    "merge_dicts",
    "now_iso",
    "parse_json_file",
    "parse_json_value",
    "render_eval_report_markdown",
    "resolve_billable_account_uid",
    "run_and_evaluate_evalset",
    "run_case_evaluators",
    "timestamp_slug",
    "watch_runs",
    "write_eval_report_csv",
    "write_eval_reports",
]
