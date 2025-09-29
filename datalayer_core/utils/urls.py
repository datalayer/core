# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Centralized URL configuration for Datalayer services.

Provides environment variable support with fallback to defaults.
"""

import os
from dataclasses import dataclass
from typing import Optional

from datalayer_core.utils.defaults import DEFAULT_RUN_URL, DEFAULT_IAM_URL


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
    """
    run_url: str
    iam_url: str
    
    @classmethod
    def from_environment(
        cls,
        run_url: Optional[str] = None,
        iam_url: Optional[str] = None,
    ) -> "DatalayerURLs":
        """
        Create DatalayerURLs instance from environment variables and parameters.
        
        Parameters
        ----------
        run_url : Optional[str]
            Override for the run URL. If None, will check DATALAYER_RUN_URL env var
            then fallback to DEFAULT_RUN_URL.
        iam_url : Optional[str]
            Override for the IAM URL. If None, will check DATALAYER_IAM_URL env var
            then fallback to DEFAULT_IAM_URL.
        
        Returns
        -------
        DatalayerURLs
            Configured URLs instance.
        """
        # Determine run_url with priority: parameter > env var > default
        resolved_run_url = (
            run_url 
            or os.environ.get("DATALAYER_RUN_URL")
            or DEFAULT_RUN_URL
        )
        
        # Determine iam_url with priority: parameter > env var > default
        resolved_iam_url = (
            iam_url 
            or os.environ.get("DATALAYER_IAM_URL")
            or DEFAULT_IAM_URL
        )
        
        # Strip trailing slashes for consistency
        resolved_run_url = resolved_run_url.rstrip("/")
        resolved_iam_url = resolved_iam_url.rstrip("/")
        
        return cls(
            run_url=resolved_run_url,
            iam_url=resolved_iam_url,
        )
    
    def __post_init__(self):
        """Ensure URLs don't have trailing slashes."""
        self.run_url = self.run_url.rstrip("/")
        self.iam_url = self.iam_url.rstrip("/")