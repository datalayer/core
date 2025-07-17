# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from dataclasses import dataclass
from pydoc_markdown.interfaces import Processor


@dataclass
class Docstring:
    content: str

    def __repr__(self):
        return self.content

    def __str__(self):
        return self.content


@dataclass
class ReplaceProcessor(Processor):
    def process(self, modules, config):
        for module in modules:
            self._process_node(module)

    def _process_node(self, node):
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
