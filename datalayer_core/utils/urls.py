# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Centralized URL configuration for Datalayer services.

Provides environment variable support with fallback to defaults.
"""

import os
from dataclasses import dataclass
from typing import Optional


DEFAULT_DATALAYER_RUN_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_IAM_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_RUNTIMES_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_SPACER_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_LIBRARY_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_MANAGER_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_AI_AGENTS_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_AI_INFERENCE_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_MCP_SERVERS_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_GROWTH_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_SUCCESS_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_STATUS_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_SUPPORT_URL = "https://prod1.datalayer.run"


@dataclass
class DatalayerURLs:
    """
    Centralized configuration for Datalayer service URLs.

    This class manages URL configuration with support for environment variables
    and fallback to default values.

    Attributes
    ----------
    run_url : str
        The Datalayer runtime/service URL
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
    status_url : str
        The Datalayer status service URL
    support_url : str
        The Datalayer support service URL
    mcp_server_url : str
        The Datalayer MCP server service URL
    """

    run_url: str
    iam_url: str
    runtimes_url: str
    spacer_url: str
    library_url: str
    manager_url: str
    ai_agents_url: str
    ai_inference_url: str
    growth_url: str
    success_url: str
    status_url: str
    support_url: str
    mcp_server_url: str

    @classmethod
    def from_environment(
        cls,
        run_url: Optional[str] = None,
        iam_url: Optional[str] = None,
        runtimes_url: Optional[str] = None,
        spacer_url: Optional[str] = None,
        library_url: Optional[str] = None,
        manager_url: Optional[str] = None,
        ai_agents_url: Optional[str] = None,
        ai_inference_url: Optional[str] = None,
        growth_url: Optional[str] = None,
        success_url: Optional[str] = None,
        status_url: Optional[str] = None,
        support_url: Optional[str] = None,
        mcp_server_url: Optional[str] = None,
    ) -> "DatalayerURLs":
        """
        Create DatalayerURLs instance from environment variables and parameters.

        Parameters
        ----------
        run_url : Optional[str]
            Override for the run URL. If None, will check DATALAYER_RUN_URL env var
            then fallback to DEFAULT_DATALAYER_RUN_URL.
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

        Notes
        -----
        When iam_url is provided, all other service URLs will be derived from the iam_url
        unless explicitly overridden. This allows setting a single base URL for all services.

        Returns
        -------
        DatalayerURLs
            Configured URLs instance.
        """
        # Determine base URLs first
        resolved_run_url = (
            run_url or os.environ.get("DATALAYER_RUN_URL") or DEFAULT_DATALAYER_RUN_URL
        )
        resolved_iam_url = (
            iam_url or os.environ.get("DATALAYER_IAM_URL") or DEFAULT_DATALAYER_IAM_URL
        )
        
        # If iam_url is provided (either as parameter or env var),
        # use the iam_url as the base for all other services unless explicitly overridden
        base_url_for_services = resolved_iam_url if (iam_url or os.environ.get("DATALAYER_IAM_URL")) else None
        
        # Determine service URLs with priority: parameter > env var > base_url_for_services > default
        resolved_runtimes_url = (
            runtimes_url or 
            os.environ.get("DATALAYER_RUNTIMES_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_RUNTIMES_URL
        )
        resolved_spacer_url = (
            spacer_url or 
            os.environ.get("DATALAYER_SPACER_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_SPACER_URL
        )
        resolved_library_url = (
            library_url or 
            os.environ.get("DATALAYER_LIBRARY_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_LIBRARY_URL
        )
        resolved_manager_url = (
            manager_url or 
            os.environ.get("DATALAYER_MANAGER_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_MANAGER_URL
        )
        resolved_ai_agents_url = (
            ai_agents_url or 
            os.environ.get("DATALAYER_AI_AGENTS_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_AI_AGENTS_URL
        )
        resolved_ai_inference_url = (
            ai_inference_url or 
            os.environ.get("DATALAYER_AI_INFERENCE_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_AI_INFERENCE_URL
        )
        resolved_growth_url = (
            growth_url or 
            os.environ.get("DATALAYER_GROWTH_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_GROWTH_URL
        )
        resolved_success_url = (
            success_url or 
            os.environ.get("DATALAYER_SUCCESS_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_SUCCESS_URL
        )
        resolved_status_url = (
            status_url or 
            os.environ.get("DATALAYER_STATUS_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_STATUS_URL
        )
        resolved_support_url = (
            support_url or 
            os.environ.get("DATALAYER_SUPPORT_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_SUPPORT_URL
        )
        resolved_mcp_server_url = (
            mcp_server_url or 
            os.environ.get("DATALAYER_MCP_SERVER_URL") or 
            base_url_for_services or 
            DEFAULT_DATALAYER_MCP_SERVERS_URL
        )

        # Strip trailing slashes for consistency
        resolved_run_url = resolved_run_url.rstrip("/")
        resolved_iam_url = resolved_iam_url.rstrip("/")
        resolved_runtimes_url = resolved_runtimes_url.rstrip("/")
        resolved_spacer_url = resolved_spacer_url.rstrip("/")
        resolved_library_url = resolved_library_url.rstrip("/")
        resolved_manager_url = resolved_manager_url.rstrip("/")
        resolved_ai_agents_url = resolved_ai_agents_url.rstrip("/")
        resolved_ai_inference_url = resolved_ai_inference_url.rstrip("/")
        resolved_growth_url = resolved_growth_url.rstrip("/")
        resolved_success_url = resolved_success_url.rstrip("/")
        resolved_status_url = resolved_status_url.rstrip("/")
        resolved_support_url = resolved_support_url.rstrip("/")
        resolved_mcp_server_url = resolved_mcp_server_url.rstrip("/")

        return cls(
            run_url=resolved_run_url,
            iam_url=resolved_iam_url,
            runtimes_url=resolved_runtimes_url,
            spacer_url=resolved_spacer_url,
            library_url=resolved_library_url,
            manager_url=resolved_manager_url,
            ai_agents_url=resolved_ai_agents_url,
            ai_inference_url=resolved_ai_inference_url,
            growth_url=resolved_growth_url,
            success_url=resolved_success_url,
            status_url=resolved_status_url,
            support_url=resolved_support_url,
            mcp_server_url=resolved_mcp_server_url,
        )

    def __post_init__(self):
        """Ensure URLs don't have trailing slashes."""
        self.run_url = self.run_url.rstrip("/")
        self.iam_url = self.iam_url.rstrip("/")
        self.runtimes_url = self.runtimes_url.rstrip("/")
        self.spacer_url = self.spacer_url.rstrip("/")
        self.library_url = self.library_url.rstrip("/")
        self.manager_url = self.manager_url.rstrip("/")
        self.ai_agents_url = self.ai_agents_url.rstrip("/")
        self.ai_inference_url = self.ai_inference_url.rstrip("/")
        self.growth_url = self.growth_url.rstrip("/")
        self.success_url = self.success_url.rstrip("/")
        self.status_url = self.status_url.rstrip("/")
        self.support_url = self.support_url.rstrip("/")
        self.mcp_server_url = self.mcp_server_url.rstrip("/")
