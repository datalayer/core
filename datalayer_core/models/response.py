# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Response models for handling code execution results in Datalayer SDK.
"""

from typing import Any, Dict, List

from pydantic import BaseModel, Field, computed_field


class Response(BaseModel):
    """
    Pydantic model representing the response from code execution in a runtime.
    """

    execute_response: List[Dict[str, Any]] = Field(
        ..., description="The response from the code execution"
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
        return f"Response({self.stdout}, {self.stderr})"
