# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Replace processor for pydoc generation in Datalayer Core."""

from dataclasses import dataclass
from typing import Any, List

from pydoc_markdown.interfaces import Processor


@dataclass
class Docstring:
    """Docstring representation for processing."""

    content: str

    def __repr__(self) -> str:
        return self.content

    def __str__(self) -> str:
        """
        Return string content of the docstring.

        Returns
        -------
        str
            The docstring content as a string.
        """
        return self.content


@dataclass
class ReplaceProcessor(Processor):
    """Processor for replacing text in documentation."""

    def process(self, modules: List[Any], config: Any) -> None:
        """
        Process modules to replace text in docstrings.

        Parameters
        ----------
        modules : list
            List of modules to process.
        config : object
            Configuration object for processing.
        """
        for module in modules:
            self._process_node(module)

    def _process_node(self, node: Any) -> None:
        """
        Process a single node to replace text in its docstring.

        Parameters
        ----------
        node : object
            The documentation node to process.
        """
        # Replace in docstring if it exists
        if getattr(node, "docstring", None):
            # Convert docstring to string (handles Docstring or str)
            docstring_text = str(node.docstring)
            # Replace braces with HTML entities
            replaced_text = docstring_text.replace("{", "&#123;").replace("}", "&#125;")
            # Assign the replaced string back as plain string
            node.docstring = Docstring(replaced_text)

        # Recursively process children members if any
        for member in getattr(node, "members", []):
            self._process_node(member)
