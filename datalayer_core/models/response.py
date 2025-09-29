# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Response classes for handling code execution results in Datalayer SDK.
"""

from typing import Any


class Response:
    """
    Represents the response from code execution in a runtime.

    Parameters
    ----------
    execute_response : list[dict[str, Any]]
        The response from the code execution.
    """

    def __init__(self, execute_response: list[dict[str, Any]]):
        """
        Initialize a response object.

        Parameters
        ----------
        execute_response : list[dict[str, Any]]
            The response from the code execution.
        """
        stdout = []
        stderr = []
        for item in execute_response:
            if item and item.get("output_type") == "stream":
                stdout.append(item["text"])
            elif item and item.get("output_type") == "error":
                stderr.append(item["ename"])
                stderr.append(item["evalue"])

        self._stdout = "\n".join(stdout)
        self._stderr = "\n".join(stderr)

    def __repr__(self) -> str:
        return f"Response({self._stdout}, {self._stderr})"

    @property
    def stdout(self) -> str:
        """
        Get the standard output of the code execution.

        Returns
        -------
        str
            The standard output as a string.
        """
        return self._stdout

    @property
    def stderr(self) -> str:
        """
        Get the standard error of the code execution.

        Returns
        -------
        str
            The standard error as a string.
        """
        return self._stderr
