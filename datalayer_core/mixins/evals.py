# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Evals management mixin for Datalayer Core."""

from __future__ import annotations

from typing import Any, Optional


class EvalsMixin:
    """Mixin for managing evals, experiments, runs, and live monitoring."""

    def _evals_request(
        self,
        path: str,
        *,
        method: str,
        account_uid: Optional[str] = None,
        params: Optional[dict[str, Any]] = None,
        json_body: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        query: dict[str, Any] = dict(params or {})
        if account_uid:
            query["account_uid"] = account_uid
        response = self._fetch(  # type: ignore
            f"{self.urls.ai_agents_url}/api/ai-agents/v1/evals{path}",  # type: ignore
            method=method,
            params=query,
            json=json_body,
        )
        return response.json()

    def evals_list_evals(
        self,
        *,
        kind: Optional[str] = None,
        source: Optional[str] = None,
        q: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if kind:
            params["kind"] = kind
        if source:
            params["source"] = source
        if q:
            params["q"] = q
        return self._evals_request(
            "/evals",
            method="GET",
            params=params,
            account_uid=account_uid,
        )

    def evals_create_eval(
        self,
        *,
        name: str,
        description: str = "",
        source: str = "hosted",
        kind: str = "offline",
        schema: Optional[dict[str, Any]] = None,
        tags: Optional[list[str]] = None,
        metadata: Optional[dict[str, Any]] = None,
        cases: Optional[list[dict[str, Any]]] = None,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        body = {
            "name": name,
            "description": description,
            "source": source,
            "kind": kind,
            "schema": schema or {},
            "tags": tags or [],
            "metadata": metadata or {},
            "cases": cases or [],
        }
        return self._evals_request(
            "/evals",
            method="POST",
            json_body=body,
            account_uid=account_uid,
        )

    def evals_delete_eval(
        self,
        eval_id: str,
        *,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._evals_request(
            f"/evals/{eval_id}",
            method="DELETE",
            account_uid=account_uid,
        )

    def evals_list_experiments(
        self,
        *,
        eval_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if eval_id:
            params["eval_id"] = eval_id
        if status:
            params["status"] = status
        return self._evals_request(
            "/experiments",
            method="GET",
            params=params,
            account_uid=account_uid,
        )

    def evals_create_experiment(
        self,
        *,
        name: str,
        eval_id: Optional[str] = None,
        description: str = "",
        status: str = "draft",
        config: Optional[dict[str, Any]] = None,
        summary: Optional[dict[str, Any]] = None,
        tags: Optional[list[str]] = None,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        body = {
            "name": name,
            "eval_id": eval_id,
            "description": description,
            "status": status,
            "config": config or {},
            "summary": summary or {},
            "tags": tags or [],
        }
        return self._evals_request(
            "/experiments",
            method="POST",
            json_body=body,
            account_uid=account_uid,
        )

    def evals_delete_experiment(
        self,
        experiment_id: str,
        *,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._evals_request(
            f"/experiments/{experiment_id}",
            method="DELETE",
            account_uid=account_uid,
        )

    def evals_list_runs(
        self,
        experiment_id: str,
        *,
        limit: int = 50,
        offset: int = 0,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._evals_request(
            f"/experiments/{experiment_id}/runs",
            method="GET",
            params={"limit": limit, "offset": offset},
            account_uid=account_uid,
        )

    def evals_create_run(
        self,
        experiment_id: str,
        *,
        status: str = "queued",
        started_at: Optional[str] = None,
        ended_at: Optional[str] = None,
        metrics: Optional[dict[str, Any]] = None,
        summary: Optional[dict[str, Any]] = None,
        report: Optional[dict[str, Any]] = None,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "status": status,
            "metrics": metrics or {},
            "summary": summary or {},
            "report": report or {},
        }
        if started_at:
            body["started_at"] = started_at
        if ended_at:
            body["ended_at"] = ended_at
        return self._evals_request(
            f"/experiments/{experiment_id}/runs",
            method="POST",
            json_body=body,
            account_uid=account_uid,
        )

    def evals_get_run(
        self,
        run_id: str,
        *,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._evals_request(
            f"/runs/{run_id}",
            method="GET",
            account_uid=account_uid,
        )

    def evals_compare_runs(
        self,
        run_ids: list[str],
        *,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._evals_request(
            "/runs/compare",
            method="POST",
            json_body={"run_ids": run_ids},
            account_uid=account_uid,
        )

    def evals_list_live_targets(
        self,
        *,
        window: str = "24h",
        limit: int = 50,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        return self._evals_request(
            "/live/targets",
            method="GET",
            params={"window": window, "limit": limit},
            account_uid=account_uid,
        )

    def evals_list_live_events(
        self,
        *,
        target_id: str,
        target_type: str = "agent",
        window: str = "24h",
        evaluator_name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        account_uid: Optional[str] = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "target_id": target_id,
            "target_type": target_type,
            "window": window,
            "limit": limit,
            "offset": offset,
        }
        if evaluator_name:
            params["evaluator_name"] = evaluator_name
        return self._evals_request(
            "/live/events",
            method="GET",
            params=params,
            account_uid=account_uid,
        )