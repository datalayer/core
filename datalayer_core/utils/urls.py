# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Centralized URL configuration for Datalayer services.

Provides environment variable support with fallback to defaults.
"""

import os
from dataclasses import asdict
from dataclasses import dataclass
from typing import Optional

from datalayer_core.base.user_config import (
    get_iam_url as _get_config_iam_url,
)
from datalayer_core.base.user_config import (
    get_runtimes_url as _get_config_runtimes_url,
)

DEFAULT_DATALAYER_SERVICE_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_IAM_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_RUNTIMES_URL = "https://r1.datalayer.run"

DEFAULT_DATALAYER_SPACER_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_LIBRARY_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_MANAGER_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_AI_AGENTS_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_AI_INFERENCE_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_JUPYTER_MCP_SERVER_URL = "https://mcp.datalayer.run/mcp"

DEFAULT_DATALAYER_OTEL_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_GROWTH_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_SUCCESS_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_STATUS_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_SUPPORT_URL = DEFAULT_DATALAYER_SERVICE_URL

DEFAULT_DATALAYER_SCHEDULER_URL = DEFAULT_DATALAYER_SERVICE_URL

# Contents runs on the runtimes plane, where the NFS that backs the Home
# Folder and Volumes lives, so it shares the runtimes host.
DEFAULT_DATALAYER_CONTENTS_URL = DEFAULT_DATALAYER_RUNTIMES_URL


@dataclass
class DatalayerURLs:
    """
    Centralized configuration for Datalayer service URLs.

    This class manages URL configuration with support for environment variables
    and fallback to default values.

    Attributes
    ----------
    iam_url : str
        The Datalayer IAM service URL
    runtimes_url : str
        The Datalayer runtimes service URL
    spacer_url : str
        The Datalayer spacer service URL
    library_url : str
        The Datalayer library service URL
    manager_url : str
        The Datalayer manager service URL
    ai_agents_url : str
        The Datalayer AI agents service URL
    ai_inference_url : str
        The Datalayer AI inference service URL
    growth_url : str
        The Datalayer growth service URL
    success_url : str
        The Datalayer success service URL
    otel_url : str
        The Datalayer OTEL service URL
    status_url : str
        The Datalayer status service URL
    support_url : str
        The Datalayer support service URL
    jupyter_mcp_server_url : str
        The Datalayer Jupyter MCP Server URL
    scheduler_url : str
        The Datalayer scheduler service URL
    """

    iam_url: str
    runtimes_url: str
    spacer_url: str
    library_url: str
    manager_url: str
    ai_agents_url: str
    ai_inference_url: str
    otel_url: str
    growth_url: str
    success_url: str
    status_url: str
    support_url: str
    jupyter_mcp_server_url: str
    scheduler_url: str
    contents_url: str = DEFAULT_DATALAYER_CONTENTS_URL

    @classmethod
    def from_environment(
        cls,
        iam_url: Optional[str] = None,
        runtimes_url: Optional[str] = None,
        spacer_url: Optional[str] = None,
        library_url: Optional[str] = None,
        manager_url: Optional[str] = None,
        ai_agents_url: Optional[str] = None,
        ai_inference_url: Optional[str] = None,
        otel_url: Optional[str] = None,
        growth_url: Optional[str] = None,
        success_url: Optional[str] = None,
        status_url: Optional[str] = None,
        support_url: Optional[str] = None,
        jupyter_mcp_server_url: Optional[str] = None,
        scheduler_url: Optional[str] = None,
        contents_url: Optional[str] = None,
    ) -> "DatalayerURLs":
        """
        Create DatalayerURLs instance from environment variables and parameters.

        Parameters
        ----------
        iam_url : Optional[str]
            Override for the IAM URL. If None, will check DATALAYER_IAM_URL env var
            then fallback to DEFAULT_DATALAYER_IAM_URL.
        runtimes_url : Optional[str]
            Override for the runtimes URL. If None, will check DATALAYER_RUNTIMES_URL env var
            then fallback to DEFAULT_DATALAYER_RUNTIMES_URL.
        spacer_url : Optional[str]
            Override for the spacer URL. If None, will check DATALAYER_SPACER_URL env var
            then fallback to DEFAULT_DATALAYER_SPACER_URL.
        library_url : Optional[str]
            Override for the library URL. If None, will check DATALAYER_LIBRARY_URL env var
            then fallback to DEFAULT_DATALAYER_LIBRARY_URL.
        manager_url : Optional[str]
            Override for the manager URL. If None, will check DATALAYER_MANAGER_URL env var
            then fallback to DEFAULT_DATALAYER_MANAGER_URL.
        ai_agents_url : Optional[str]
            Override for the AI agents URL. If None, will check DATALAYER_AI_AGENTS_URL env var
            then fallback to DEFAULT_DATALAYER_AI_AGENTS_URL.
        ai_inference_url : Optional[str]
            Override for the AI inference URL. If None, will check DATALAYER_AI_INFERENCE_URL env var
            then fallback to DEFAULT_DATALAYER_AI_INFERENCE_URL.
        otel_url : Optional[str]
            Override for the OTEL URL. If None, will check DATALAYER_OTEL_URL env var
            then fallback to DEFAULT_DATALAYER_OTEL_URL.
        growth_url : Optional[str]
            Override for the growth URL. If None, will check DATALAYER_GROWTH_URL env var
            then fallback to DEFAULT_DATALAYER_GROWTH_URL.
        success_url : Optional[str]
            Override for the success URL. If None, will check DATALAYER_SUCCESS_URL env var
            then fallback to DEFAULT_DATALAYER_SUCCESS_URL.
        status_url : Optional[str]
            Override for the status URL. If None, will check DATALAYER_STATUS_URL env var
            then fallback to DEFAULT_DATALAYER_STATUS_URL.
        support_url : Optional[str]
            Override for the support URL. If None, will check DATALAYER_SUPPORT_URL env var
            then fallback to DEFAULT_DATALAYER_SUPPORT_URL.
        jupyter_mcp_server_url : Optional[str]
            Override for the Jupyter MCP Server URL. If None, will check
            DATALAYER_JUPYTER_MCP_SERVER_URL, then fallback to
            DEFAULT_DATALAYER_JUPYTER_MCP_SERVER_URL.
        scheduler_url : Optional[str]
            Override for the scheduler URL. If None, will check DATALAYER_SCHEDULER_URL env var
            then fallback to DEFAULT_DATALAYER_SCHEDULER_URL.

        Returns
        -------
        DatalayerURLs
            Configured URLs instance.

        Notes
        -----
        When iam_url is provided, other service URLs are derived from it unless explicitly
        overridden. The Jupyter MCP Server remains independent and uses its dedicated
        environment variable or hosted default.
        """
        # Determine base URLs first
        resolved_iam_url = (
            iam_url
            or os.environ.get("DATALAYER_IAM_URL")
            or _get_config_iam_url()
            or DEFAULT_DATALAYER_IAM_URL
        )

        # If iam_url is provided (either as parameter or env var),
        # use the iam_url as the base for all other services unless explicitly overridden
        base_url_for_services = (
            resolved_iam_url
            if (iam_url or os.environ.get("DATALAYER_IAM_URL"))
            else None
        )

        # Determine service URLs with priority:
        #   parameter > env var > config file > base_url_for_services > default
        # For runtimes_url and iam_url, the config file takes precedence over
        # the IAM-derived base_url_for_services so that explicit user config
        # (e.g. "runtimes on r1, iam on prod1") is respected.
        config_runtimes_url = _get_config_runtimes_url()
        resolved_runtimes_url = (
            runtimes_url
            or os.environ.get("DATALAYER_RUNTIMES_URL")
            or config_runtimes_url
            or base_url_for_services
            or DEFAULT_DATALAYER_RUNTIMES_URL
        )
        resolved_spacer_url = (
            spacer_url
            or os.environ.get("DATALAYER_SPACER_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_SPACER_URL
        )
        resolved_library_url = (
            library_url
            or os.environ.get("DATALAYER_LIBRARY_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_LIBRARY_URL
        )
        resolved_manager_url = (
            manager_url
            or os.environ.get("DATALAYER_MANAGER_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_MANAGER_URL
        )
        resolved_ai_agents_url = (
            ai_agents_url
            or os.environ.get("DATALAYER_AI_AGENTS_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_AI_AGENTS_URL
        )
        resolved_ai_inference_url = (
            ai_inference_url
            or os.environ.get("DATALAYER_AI_INFERENCE_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_AI_INFERENCE_URL
        )
        resolved_otel_url = (
            otel_url
            or os.environ.get("DATALAYER_OTEL_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_OTEL_URL
        )
        resolved_growth_url = (
            growth_url
            or os.environ.get("DATALAYER_GROWTH_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_GROWTH_URL
        )
        resolved_success_url = (
            success_url
            or os.environ.get("DATALAYER_SUCCESS_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_SUCCESS_URL
        )
        resolved_status_url = (
            status_url
            or os.environ.get("DATALAYER_STATUS_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_STATUS_URL
        )
        resolved_support_url = (
            support_url
            or os.environ.get("DATALAYER_SUPPORT_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_SUPPORT_URL
        )
        resolved_jupyter_mcp_server_url = (
            jupyter_mcp_server_url
            or os.environ.get("DATALAYER_JUPYTER_MCP_SERVER_URL")
            or DEFAULT_DATALAYER_JUPYTER_MCP_SERVER_URL
        )
        resolved_scheduler_url = (
            scheduler_url
            or os.environ.get("DATALAYER_SCHEDULER_URL")
            or base_url_for_services
            or DEFAULT_DATALAYER_SCHEDULER_URL
        )
        # Contents follows **runtimes**, not IAM. It is deployed on the
        # runtimes plane, beside the NFS that backs the Home Folder and the
        # Volumes, so inheriting `base_url_for_services` — the IAM host —
        # pointed every client at a host with no Contents service. Runtimes
        # already sidesteps that inheritance for the same reason; contents now
        # simply goes wherever runtimes goes, which keeps a single-host plane
        # working too because there runtimes *is* that host.
        resolved_contents_url = (
            contents_url
            or os.environ.get("DATALAYER_CONTENTS_URL")
            or resolved_runtimes_url
        )

        # Strip trailing slashes for consistency
        resolved_iam_url = resolved_iam_url.rstrip("/")
        resolved_runtimes_url = resolved_runtimes_url.rstrip("/")
        resolved_spacer_url = resolved_spacer_url.rstrip("/")
        resolved_library_url = resolved_library_url.rstrip("/")
        resolved_manager_url = resolved_manager_url.rstrip("/")
        resolved_ai_agents_url = resolved_ai_agents_url.rstrip("/")
        resolved_ai_inference_url = resolved_ai_inference_url.rstrip("/")
        resolved_otel_url = resolved_otel_url.rstrip("/")
        resolved_growth_url = resolved_growth_url.rstrip("/")
        resolved_success_url = resolved_success_url.rstrip("/")
        resolved_status_url = resolved_status_url.rstrip("/")
        resolved_support_url = resolved_support_url.rstrip("/")
        resolved_jupyter_mcp_server_url = resolved_jupyter_mcp_server_url.rstrip(
            "/"
        )
        resolved_scheduler_url = resolved_scheduler_url.rstrip("/")
        resolved_contents_url = resolved_contents_url.rstrip("/")

        return cls(
            iam_url=resolved_iam_url,
            runtimes_url=resolved_runtimes_url,
            spacer_url=resolved_spacer_url,
            library_url=resolved_library_url,
            manager_url=resolved_manager_url,
            ai_agents_url=resolved_ai_agents_url,
            ai_inference_url=resolved_ai_inference_url,
            otel_url=resolved_otel_url,
            growth_url=resolved_growth_url,
            success_url=resolved_success_url,
            status_url=resolved_status_url,
            support_url=resolved_support_url,
            jupyter_mcp_server_url=resolved_jupyter_mcp_server_url,
            scheduler_url=resolved_scheduler_url,
            contents_url=resolved_contents_url,
        )

    def __post_init__(self) -> None:
        """Ensure URLs don't have trailing slashes."""
        self.iam_url = self.iam_url.rstrip("/")
        self.runtimes_url = self.runtimes_url.rstrip("/")
        self.spacer_url = self.spacer_url.rstrip("/")
        self.library_url = self.library_url.rstrip("/")
        self.manager_url = self.manager_url.rstrip("/")
        self.ai_agents_url = self.ai_agents_url.rstrip("/")
        self.ai_inference_url = self.ai_inference_url.rstrip("/")
        self.otel_url = self.otel_url.rstrip("/")
        self.growth_url = self.growth_url.rstrip("/")
        self.success_url = self.success_url.rstrip("/")
        self.status_url = self.status_url.rstrip("/")
        self.support_url = self.support_url.rstrip("/")
        self.jupyter_mcp_server_url = self.jupyter_mcp_server_url.rstrip("/")
        self.scheduler_url = self.scheduler_url.rstrip("/")
        self.contents_url = self.contents_url.rstrip("/")

    def as_dict(self) -> dict[str, str]:
        """Return all resolved service URLs as a dictionary."""
        return asdict(self)

    @classmethod
    def get_all_urls(
        cls,
        iam_url: Optional[str] = None,
        runtimes_url: Optional[str] = None,
        spacer_url: Optional[str] = None,
        library_url: Optional[str] = None,
        manager_url: Optional[str] = None,
        ai_agents_url: Optional[str] = None,
        ai_inference_url: Optional[str] = None,
        otel_url: Optional[str] = None,
        growth_url: Optional[str] = None,
        success_url: Optional[str] = None,
        status_url: Optional[str] = None,
        support_url: Optional[str] = None,
        jupyter_mcp_server_url: Optional[str] = None,
        scheduler_url: Optional[str] = None,
        contents_url: Optional[str] = None,
    ) -> dict[str, str]:
        """Resolve and return all service URLs with optional overrides."""
        return cls.from_environment(
            iam_url=iam_url,
            runtimes_url=runtimes_url,
            spacer_url=spacer_url,
            library_url=library_url,
            manager_url=manager_url,
            ai_agents_url=ai_agents_url,
            ai_inference_url=ai_inference_url,
            otel_url=otel_url,
            growth_url=growth_url,
            success_url=success_url,
            status_url=status_url,
            support_url=support_url,
            jupyter_mcp_server_url=jupyter_mcp_server_url,
            scheduler_url=scheduler_url,
            contents_url=contents_url,
        ).as_dict()
