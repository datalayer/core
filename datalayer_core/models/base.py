# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Unified response models for all Datalayer services.
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field, computed_field

# Generic type for response data
T = TypeVar("T")


class BaseResponse(BaseModel):
    """Unified base response model for all Datalayer services."""

    success: bool = Field(..., description="Whether the operation was successful")
    message: Optional[str] = Field(None, description="Human-readable response message")


#: The envelope's own fields. A payload flattened to the top level may not use
#: these names: `message` here is a sentence for a person to read, and a payload
#: that carried its own `message` would be answered under a field that means
#: something else — or, where the types disagree, not answered at all. Naming
#: them is what lets `DataResponse` refuse the collision instead of serving it.
RESERVED_RESPONSE_FIELDS = ("success", "message")


def _as_fields(data: Any) -> Optional[Dict[str, Any]]:
    """The payload as fields, or `None` when it has none to spread.

    A mapping is already fields; a Pydantic model of either generation answers
    them. Anything else — a string, a list, a number — has none.
    """
    if isinstance(data, dict):
        return dict(data)
    if hasattr(data, "model_dump"):
        return dict(data.model_dump())
    if hasattr(data, "dict"):
        return dict(data.dict())
    return None


class DataResponse(BaseResponse, Generic[T]):
    """Generic response model that includes data payload flattened at top level."""

    def __init__(
        self,
        success: bool,
        message: Optional[str] = None,
        data: Any = None,
        key: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """
        Initialize DataResponse with optional data flattening.

        Parameters
        ----------
        success : bool
            Whether the operation was successful.
        message : Optional[str], optional
            Human-readable response message.
        data : Any, optional
            Data payload to include in response.
        key : Optional[str], optional
            Key under which to nest the data.
        **kwargs : Any
            Additional fields to include in the response.
        """
        # Start with base fields
        fields: Dict[str, Any] = {"success": success, "message": message}

        if data is not None:
            payload = _as_fields(data)
            if key:
                # Nested under the name the caller gave: no collision is
                # possible, because the payload occupies one field.
                fields[key] = payload if payload is not None else data
            elif payload is None:
                # Not a mapping and not a model: it goes under `data`, since
                # there are no fields to spread.
                fields["data"] = data
            else:
                shadowed = [name for name in RESERVED_RESPONSE_FIELDS if name in payload]
                if shadowed:
                    raise ValueError(
                        "This response flattens "
                        f"{type(data).__name__} to the top level, and it declares "
                        f"{', '.join(shadowed)}, which the envelope already uses. "
                        "Rename the field on the payload, or pass `key=` to nest "
                        "the payload under a name of its own."
                    )
                fields.update(payload)

        # Add any additional kwargs
        fields.update(kwargs)

        # Initialize with fields
        super().__init__(**fields)

    class Config:
        """Pydantic configuration for DataResponse."""

        extra = "allow"  # Allow additional fields dynamically


class ListResponse(BaseResponse, Generic[T]):
    """
    Response model for endpoints that return lists of items.
    """

    items: List[T] = Field(default_factory=list, description="List of items")
    count: Optional[int] = Field(None, description="Total number of items")
    page: Optional[int] = Field(None, description="Current page number")
    page_size: Optional[int] = Field(None, description="Number of items per page")


class ErrorResponse(BaseResponse):
    """
    Response model for error cases.
    """

    success: bool = Field(default=False, description="Always False for error responses")
    errors: List[str] = Field(
        default_factory=list, description="List of error messages"
    )
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    exception: Optional[str] = Field(
        None, description="Exception details for debugging"
    )


class ExecutionResponse(BaseResponse):
    """Response model for code execution results (legacy compatibility)."""

    execute_response: List[Dict[str, Any]] = Field(
        default_factory=list, description="The response from the code execution"
    )

    @computed_field
    def stdout(self) -> str:
        """
        Get the standard output of the code execution.

        Returns
        -------
        str
            The standard output as a string.
        """
        stdout_lines = []
        for item in self.execute_response:
            if item and item.get("output_type") == "stream":
                stdout_lines.append(item["text"])
        return "\n".join(stdout_lines)

    @computed_field
    def stderr(self) -> str:
        """
        Get the standard error of the code execution.

        Returns
        -------
        str
            The standard error as a string.
        """
        stderr_lines = []
        for item in self.execute_response:
            if item and item.get("output_type") == "error":
                stderr_lines.append(item["ename"])
                stderr_lines.append(item["evalue"])
        return "\n".join(stderr_lines)

    def __repr__(self) -> str:
        return f"ExecutionResponse({self.stdout}, {self.stderr})"
