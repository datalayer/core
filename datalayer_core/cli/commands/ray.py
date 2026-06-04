# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Ray commands for Datalayer CLI."""

from __future__ import annotations

import json
from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="ray",
    help="Manage Ray clusters and Ray jobs through the Datalayer Ray addon.",
)

clusters_app = typer.Typer(name="clusters", help="Manage Ray clusters.")
jobs_app = typer.Typer(name="jobs", help="Manage Ray jobs.")

console = Console()


def _make_client(
    token: Optional[str] = None,
    ray_url: Optional[str] = None,
) -> DatalayerClient:
    urls = DatalayerURLs.from_environment(ray_url=ray_url)
    return DatalayerClient(urls=urls, token=token)


def _load_json(raw: Optional[str], flag_name: str) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        value = json.loads(raw)
    except Exception as exc:
        raise typer.BadParameter(f"Invalid JSON for {flag_name}: {exc}") from exc
    if not isinstance(value, dict):
        raise typer.BadParameter(f"{flag_name} must decode to a JSON object")
    return value


@clusters_app.command(name="list")
def clusters_list(
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    payload = client.ray_list_clusters(namespace=namespace)
    if raw:
        console.print(payload)
        return

    items = payload.get("clusters") or []
    table = Table(title=f"Ray Clusters ({len(items)})")
    table.add_column("Name", style="cyan")
    table.add_column("Namespace")
    table.add_column("State")
    table.add_column("Workers")

    for item in items:
        metadata = item.get("metadata") or {}
        status = item.get("status") or {}
        desired = status.get("desiredWorkerReplicas")
        available = status.get("availableWorkerReplicas")
        workers = f"{available}/{desired}" if desired is not None else str(available or "")
        table.add_row(
            str(metadata.get("name", "")),
            str(metadata.get("namespace", namespace)),
            str(status.get("state", "")),
            workers,
        )

    console.print(table)


@clusters_app.command(name="create")
def clusters_create(
    name: str = typer.Argument(..., help="RayCluster name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    image: str = typer.Option("rayproject/ray:2.38.0", "--image", help="Ray container image."),
    ray_version: str = typer.Option("2.38.0", "--ray-version", help="Ray version in CR spec."),
    worker_replicas: int = typer.Option(1, "--worker-replicas", min=0),
    worker_min_replicas: int = typer.Option(1, "--worker-min-replicas", min=0),
    worker_max_replicas: int = typer.Option(3, "--worker-max-replicas", min=0),
    custom_spec_json: Optional[str] = typer.Option(
        None,
        "--custom-spec-json",
        help="Optional full RayCluster spec JSON object.",
    ),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    custom_spec = _load_json(custom_spec_json, "--custom-spec-json")
    payload: dict[str, Any] = {
        "name": name,
        "namespace": namespace,
        "image": image,
        "ray_version": ray_version,
        "worker_replicas": worker_replicas,
        "worker_min_replicas": worker_min_replicas,
        "worker_max_replicas": worker_max_replicas,
    }
    if custom_spec:
        payload["custom_spec"] = custom_spec

    client = _make_client(token=token, ray_url=ray_url)
    result = client.ray_create_cluster(payload)
    cluster = result.get("cluster") or {}
    metadata = cluster.get("metadata") or {}
    console.print(
        f"[green]Cluster created:[/green] {metadata.get('name', '')} "
        f"(ns={metadata.get('namespace', namespace)})"
    )


@clusters_app.command(name="get")
def clusters_get(
    name: str = typer.Argument(..., help="RayCluster name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    payload = client.ray_get_cluster(name, namespace=namespace)
    console.print(payload)


@clusters_app.command(name="delete")
def clusters_delete(
    name: str = typer.Argument(..., help="RayCluster name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    client.ray_delete_cluster(name, namespace=namespace)
    console.print(f"[green]Cluster deleted:[/green] {name} (ns={namespace})")


@jobs_app.command(name="submit")
def jobs_submit(
    cluster_name: str = typer.Argument(..., help="Target RayCluster name."),
    entrypoint: str = typer.Option(..., "--entrypoint", help="Ray job entrypoint command."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    job_name: Optional[str] = typer.Option(None, "--job-name", help="Optional RayJob name."),
    runtime_env_yaml: Optional[str] = typer.Option(None, "--runtime-env-yaml", help="Raw runtimeEnvYAML string."),
    shutdown_after_job_finishes: bool = typer.Option(True, "--shutdown-after-job-finishes/--keep-cluster"),
    ttl_seconds_after_finished: Optional[int] = typer.Option(3600, "--ttl-seconds-after-finished", min=0),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    payload: dict[str, Any] = {
        "entrypoint": entrypoint,
        "namespace": namespace,
        "shutdown_after_job_finishes": shutdown_after_job_finishes,
        "ttl_seconds_after_finished": ttl_seconds_after_finished,
    }
    if job_name:
        payload["job_name"] = job_name
    if runtime_env_yaml:
        payload["runtime_env_yaml"] = runtime_env_yaml

    client = _make_client(token=token, ray_url=ray_url)
    result = client.ray_submit_job(cluster_name, payload)
    job = result.get("job") or {}
    metadata = job.get("metadata") or {}
    console.print(
        f"[green]Job submitted:[/green] {metadata.get('name', '')} "
        f"(cluster={cluster_name}, ns={namespace})"
    )


@jobs_app.command(name="list")
def jobs_list(
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    cluster_name: Optional[str] = typer.Option(None, "--cluster-name", help="Filter by cluster label."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    payload = client.ray_list_jobs(namespace=namespace, cluster_name=cluster_name)
    if raw:
        console.print(payload)
        return

    items = payload.get("jobs") or []
    table = Table(title=f"Ray Jobs ({len(items)})")
    table.add_column("Name", style="cyan")
    table.add_column("Namespace")
    table.add_column("Cluster")
    table.add_column("Status")

    for item in items:
        metadata = item.get("metadata") or {}
        labels = metadata.get("labels") or {}
        status = item.get("status") or {}
        table.add_row(
            str(metadata.get("name", "")),
            str(metadata.get("namespace", namespace)),
            str(labels.get("ray.io/cluster", "")),
            str(status.get("jobStatus", "")),
        )

    console.print(table)


@jobs_app.command(name="status")
def jobs_status(
    name: str = typer.Argument(..., help="RayJob name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    payload = client.ray_get_job(name, namespace=namespace)
    console.print(payload)


@jobs_app.command(name="delete")
def jobs_delete(
    name: str = typer.Argument(..., help="RayJob name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    client.ray_delete_job(name, namespace=namespace)
    console.print(f"[green]Job deleted:[/green] {name} (ns={namespace})")


@jobs_app.command(name="logs")
def jobs_logs(
    name: str = typer.Argument(..., help="RayJob name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    pod_name: Optional[str] = typer.Option(None, "--pod-name", help="Optional explicit pod name."),
    container: Optional[str] = typer.Option(None, "--container", help="Optional pod container name."),
    tail_lines: int = typer.Option(200, "--tail-lines", min=1, max=5000),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    payload = client.ray_get_job_logs(
        name,
        namespace=namespace,
        pod_name=pod_name,
        container=container,
        tail_lines=tail_lines,
    )
    console.print(
        f"[bold]Logs[/bold] job={payload.get('job_name', name)} "
        f"pod={payload.get('pod_name', '')}"
    )
    console.print(payload.get("logs", ""))


@jobs_app.command(name="events")
def jobs_events(
    name: str = typer.Argument(..., help="RayJob name."),
    namespace: str = typer.Option("default", "--namespace", help="Kubernetes namespace."),
    limit: int = typer.Option(100, "--limit", min=1, max=1000),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ray_url: Optional[str] = typer.Option(None, "--ray-url", help="Ray addon base URL."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON."),
) -> None:
    client = _make_client(token=token, ray_url=ray_url)
    payload = client.ray_get_job_events(name, namespace=namespace, limit=limit)
    if raw:
        console.print(payload)
        return

    events = payload.get("events") or []
    table = Table(title=f"Ray Job Events ({len(events)})")
    table.add_column("Type")
    table.add_column("Reason")
    table.add_column("Target")
    table.add_column("Time")
    table.add_column("Message")

    for event in events:
        table.add_row(
            str(event.get("type") or ""),
            str(event.get("reason") or ""),
            str(event.get("involved_object_name") or ""),
            str(
                event.get("event_time")
                or event.get("last_timestamp")
                or event.get("first_timestamp")
                or ""
            ),
            str(event.get("message") or ""),
        )

    console.print(table)


app.add_typer(clusters_app)
app.add_typer(jobs_app)
