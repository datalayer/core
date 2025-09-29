# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Runtime model for Datalayer.

Provides data structures for runtime management in Datalayer environments.
"""

from typing import Optional

from pydantic import BaseModel, Field

from datalayer_core.utils.defaults import (
    DEFAULT_ENVIRONMENT,
    DEFAULT_DATALAYER_RUN_URL,
    DEFAULT_TIME_RESERVATION,
)
from datalayer_core.utils.types import (
    CreditsPerSecond,
    Minutes,
)


class RuntimeModel(BaseModel):
    """
    Pydantic model representing a Datalayer runtime (kernel).

    This model contains all the data fields and configuration parameters
    for a runtime instance, separate from the service logic.
    """

    name: str = Field(..., description="Name of the runtime (kernel)")
    environment: str = Field(
        default=DEFAULT_ENVIRONMENT,
        description="Environment type (e.g., 'python-cpu-env')",
    )
    time_reservation: Minutes = Field(
        default=DEFAULT_TIME_RESERVATION,
        description="Time reservation in minutes for the runtime",
    )
    run_url: str = Field(
        default=DEFAULT_DATALAYER_RUN_URL,
        description="Datalayer server URL",
    )
    token: Optional[str] = Field(
        default=None,
        description="Authentication token (can also be set via DATALAYER_API_KEY env var)",
    )
    pod_name: Optional[str] = Field(
        default=None,
        description="Pod name for existing runtime",
    )
    ingress: Optional[str] = Field(
        default=None,
        description="Ingress URL for the runtime",
    )
    reservation_id: Optional[str] = Field(
        default=None,
        description="Reservation ID for the runtime",
    )
    uid: Optional[str] = Field(
        default=None,
        description="Unique identifier for the runtime",
    )
    burning_rate: Optional[CreditsPerSecond] = Field(
        default=None,
        description="Cost rate for the runtime",
    )
    kernel_token: Optional[str] = Field(
        default=None,
        description="Kernel authentication token",
    )
    started_at: Optional[str] = Field(
        default=None,
        description="Runtime start timestamp",
    )
    expired_at: Optional[str] = Field(
        default=None,
        description="Runtime expiration timestamp",
    )

    @property
    def credits_limit(self) -> Optional[float]:
        """
        Calculate the credits limit based on burning rate and time reservation.

        Returns
        -------
        Optional[float]
            The credits limit, or None if burning_rate is not set.
        """
        if self.burning_rate is not None:
            return self.burning_rate * 60.0 * self.time_reservation
        return None

    def __repr__(self) -> str:
        return f"RuntimeModel(uid='{self.uid}', name='{self.name}')"
