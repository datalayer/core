# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Custom pydoc-markdown renderer for Docusaurus documentation generation.

This module provides a customized Docusaurus renderer that extends the default
pydoc-markdown functionality with specific formatting and structure for the
Datalayer Core documentation.
"""

import dataclasses
import json
import logging
import os
import re
import typing as t
from pathlib import Path

import docspec
import typing_extensions as te
from databind.core import DeserializeAs
from npdoc_to_md import render_obj_docstring
from pydoc_markdown.contrib.renderers.markdown import MarkdownRenderer
from pydoc_markdown.interfaces import Context, Renderer

logger = logging.getLogger(__name__)


REG_PATTERN = re.compile("<(?!.*span).*")

SKIP_MODULES = [
    "datalayer_core.pydoc",
]


@dataclasses.dataclass
class CustomizedMarkdownRenderer(MarkdownRenderer):
    """We override some defaults in this subclass."""

    #: Disabled because Docusaurus supports this automatically.
    insert_header_anchors: bool = False

    #: Escape html in docstring, otherwise it could lead to invalid html.
    escape_html_in_docstring: bool = True

    #: Conforms to Docusaurus header format.
    render_module_header_template: str = (
        "---\nsidebar_label: {relative_module_name}\ntitle: {module_name}\n---\n\n"
    )


def _render(
    obj: t.Any, fp: t.TextIO, level: int = 2, base: str = "datalayer_core"
) -> None:
    """
    Render the object documentation recursively, starting from the given base module.

    Parameters
    ----------
    obj : t.Any
        The docspec object to render documentation for.
    fp : t.TextIO
        The file pointer to write the rendered documentation to.
    level : int, default 2
        The markdown header level to start from.
    base : str, default "datalayer_core"
        The base module name to prepend to object names.
    """
    obj_mod = f"{base}.{obj.name}"
    for skip_mod in SKIP_MODULES:
        if obj_mod.startswith(skip_mod):
            return

    prefix = ""
    if level == 3:
        if isinstance(obj, docspec.Class):
            prefix = "class "
        elif isinstance(obj, docspec.Function):
            prefix = "def "

    md_content = render_obj_docstring(
        obj_mod,
        alias=prefix + obj_mod.split(".")[-1],
        examples_md_lang="raw",
        remove_doctest_skip=True,
        remove_doctest_blanklines=True,
        md_section_level=level,
    )

    md_content = md_content.replace("{", "&#123;").replace("}", "&#125;")
    for item in re.findall(REG_PATTERN, md_content):
        md_content = md_content.replace(
            item, item.replace("<", "&lt;").replace(">", "&gt;")
        )

    md_content = md_content.replace(
        ' style="color:purple"', ' style={{color:"purple"}}'
    )
    fp.write(md_content + "\n\n")
    if hasattr(obj, "members"):
        for member in obj.members:
            try:
                _render(member, fp, level=level + 1, base=obj_mod)
            except Exception:
                pass


@dataclasses.dataclass
class MyDocusaurusRenderer(Renderer):
    """
    Custom Docusaurus renderer for pydoc-markdown.
    """

    #: The #MarkdownRenderer configuration.
    markdown: te.Annotated[
        MarkdownRenderer, DeserializeAs(CustomizedMarkdownRenderer)
    ] = dataclasses.field(default_factory=CustomizedMarkdownRenderer)

    #: The path where the docusaurus docs content is. Defaults "docs" folder.
    docs_base_path: str = "docs"

    #: The output path inside the docs_base_path folder, used to output the
    #: module reference.
    relative_output_path: str = "reference"

    #: The sidebar path inside the docs_base_path folder, used to output the
    #: sidebar for the module reference.
    relative_sidebar_path: str = "sidebar.json"

    #: The top-level label in the sidebar. Default to 'Reference'. Can be set to null to
    #: remove the sidebar top-level all together. This option assumes that there is only one top-level module.
    sidebar_top_level_label: t.Optional[str] = "Reference"

    #: The top-level module label in the sidebar. Default to null, meaning that the actual
    #: module name will be used. This option assumes that there is only one top-level module.
    sidebar_top_level_module_label: t.Optional[str] = None

    def init(self, context: Context) -> None:
        """
        Initialize the renderer with the given context.

        Parameters
        ----------
        context : Context
            The pydoc-markdown context object.
        """
        self.markdown.init(context)

    def render(self, modules: t.List[docspec.Module]) -> None:
        """
        Render the given modules to Markdown files and generate sidebar configuration.

        Parameters
        ----------
        modules : t.List[docspec.Module]
            List of docspec modules to render documentation for.
        """
        module_tree: t.Dict[str, t.Any] = {"children": {}, "edges": []}
        output_path = Path(self.docs_base_path) / self.relative_output_path
        for module in modules:
            filepath = output_path

            module_parts = module.name.split(".")
            if module.location.filename.endswith("__init__.py"):
                module_parts.append("__init__")

            relative_module_tree = module_tree
            intermediary_module = []

            for module_part in module_parts[:-1]:
                # update the module tree
                intermediary_module.append(module_part)
                intermediary_module_name = ".".join(intermediary_module)
                relative_module_tree["children"].setdefault(
                    intermediary_module_name, {"children": {}, "edges": []}
                )
                relative_module_tree = relative_module_tree["children"][
                    intermediary_module_name
                ]

                # descend to the file
                filepath = filepath / module_part

            # create intermediary missing directories and get the full path
            filepath.mkdir(parents=True, exist_ok=True)
            filepath = filepath / f"{module_parts[-1]}.md"

            with filepath.open("w", encoding=self.markdown.encoding) as fp:
                logger.info("Render file %s", filepath)
                fp.write(f"---\ntitle: {module_parts[-1]}\n---\n")
                _render(module, fp, level=2)
                # self.markdown.render_single_page(fp, [module])

            # only update the relative module tree if the file is not empty
            relative_module_tree["edges"].append(
                os.path.splitext(str(filepath.relative_to(self.docs_base_path)))[0]
            )

        self._render_side_bar_config(module_tree)

    def _render_side_bar_config(self, module_tree: t.Dict[t.Text, t.Any]) -> None:
        """
        Render sidebar configuration in a JSON file.

        See Docusaurus sidebar structure:
        https://v2.docusaurus.io/docs/docs-introduction/#sidebar

        Parameters
        ----------
        module_tree : t.Dict[t.Text, t.Any]
            The module tree structure to convert to sidebar configuration.
        """
        sidebar: t.Dict[str, t.Any] = {
            "type": "category",
            "label": self.sidebar_top_level_label,
        }
        self._build_sidebar_tree(sidebar, module_tree)

        if sidebar.get("items"):
            if self.sidebar_top_level_module_label:
                sidebar["items"][0]["label"] = self.sidebar_top_level_module_label

            if not self.sidebar_top_level_label:
                # it needs to be a dictionary, not a list; this assumes that
                # there is only one top-level module
                sidebar = sidebar["items"][0]

        sidebar_path = (
            Path(self.docs_base_path)
            / self.relative_output_path
            / self.relative_sidebar_path
        )
        with sidebar_path.open("w") as handle:
            logger.info("Render file %s", sidebar_path)
            json.dump(sidebar, handle, indent=2, sort_keys=True)

    def _build_sidebar_tree(
        self, sidebar: t.Dict[t.Text, t.Any], module_tree: t.Dict[t.Text, t.Any]
    ) -> None:
        """
        Recursively build the sidebar tree following Docusaurus sidebar structure.

        See: https://v2.docusaurus.io/docs/docs-introduction/#sidebar

        Parameters
        ----------
        sidebar : t.Dict[t.Text, t.Any]
            The sidebar dictionary to populate with items.
        module_tree : t.Dict[t.Text, t.Any]
            The module tree structure to process.
        """
        sidebar["items"] = module_tree.get("edges", [])
        if os.name == "nt":
            # Make generated configuration more portable across operating systems (see #129).
            sidebar["items"] = [x.replace("\\", "/") for x in sidebar["items"]]
        for child_name, child_tree in module_tree.get("children", {}).items():
            child = {
                "type": "category",
                "label": child_name,
            }
            self._build_sidebar_tree(child, child_tree)
            sidebar["items"].append(child)

        def _sort_items(
            item: t.Union[t.Text, t.Dict[t.Text, t.Any]],
        ) -> t.Tuple[int, t.Text]:
            """
            Sort sidebar items with specific ordering rules.

            Order follows:
            1. modules containing items come first
            2. alphanumeric order is applied

            Parameters
            ----------
            item : t.Union[t.Text, t.Dict[t.Text, t.Any]]
                The sidebar item to extract sort key from.

            Returns
            -------
            t.Tuple[int, t.Text]
                A tuple of (priority, label) for sorting.
            """
            is_edge = int(isinstance(item, str))
            label = item if is_edge else item.get("label")  # type: ignore
            return is_edge, str(label)

        sidebar["items"] = sorted(sidebar["items"], key=_sort_items)
