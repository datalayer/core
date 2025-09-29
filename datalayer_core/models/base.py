# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Unified response models for all Datalayer services.
"""

from typing import Any, Dict, List, Optional, Generic, TypeVar

from pydantic import BaseModel, Field, computed_field

# Generic type for response data
T = TypeVar('T')


class BaseResponse(BaseModel):
    """
    Unified base response model for all Datalayer services.
    This model provides the standard response structure used across:
    - IAM service
    - Growth service
    - AI-inference service
    - Core SDK
    """
    
    success: bool = Field(..., description="Whether the operation was successful")
    message: Optional[str] = Field(None, description="Human-readable response message")


class DataResponse(BaseResponse, Generic[T]):
    """
    Generic response model that includes data payload.
    Used when returning structured data from API endpoints.
    """
    
    data: Optional[T] = Field(None, description="Response data payload")


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
    errors: List[str] = Field(default_factory=list, description="List of error messages")
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    exception: Optional[str] = Field(None, description="Exception details for debugging")


class ExecutionResponse(BaseResponse):
    """
    Response model for code execution results (legacy compatibility).
    Used by the Core SDK for runtime code execution.
    """

    execute_response: List[Dict[str, Any]] = Field(
        default_factory=list, description="The response from the code execution"
    )

    @computed_field
    @property
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
    @property
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


# Legacy aliases for backward compatibility
Response = ExecutionResponse
