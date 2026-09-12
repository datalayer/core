# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Spaces and the items they hold."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ItemModel:
    """An item in a space: a notebook, a cell, a document, a dataset."""

    uid: str
    name: str
    kind: str
    space_uid: str = ""
    space_name: str = ""
    description: str = ""
    #: The file name of a notebook, which differs from its display name.
    notebook_name: str = ""

    @classmethod
    def from_response(
        cls, data: dict[str, Any], space_uid: str = "", space_name: str = ""
    ) -> "ItemModel":
        """
        Build an item from the platform's response.

        The platform stores Solr documents, so fields arrive with type
        suffixes — ``name_t``, ``type_s``. Both spellings are accepted so a
        caller is not broken by a field being renamed underneath it.

        Parameters
        ----------
        data : dict
            One item, as the platform returned it.
        space_uid : str
            The space this item belongs to.
        space_name : str
            That space's display name, carried so a caller listing notebooks
            across spaces can say where each one lives.

        Returns
        -------
        ItemModel
            The item.
        """
        return cls(
            uid=data.get("uid", ""),
            name=data.get("name_t") or data.get("name") or "",
            kind=data.get("type_s") or data.get("type") or "",
            space_uid=space_uid,
            space_name=space_name,
            description=data.get("description_t") or data.get("description") or "",
            notebook_name=data.get("notebook_name_s") or "",
        )

    def is_notebook(self) -> bool:
        """
        Whether this item is a notebook.

        Returns
        -------
        bool
            True when the platform typed it as a notebook.
        """
        return self.kind.lower() == "notebook"

    def __str__(self) -> str:
        return f"{self.name} ({self.uid})"


@dataclass
class SpaceModel:
    """A space, and the items it holds."""

    uid: str
    name: str
    handle: str
    description: str = ""
    items: list[ItemModel] = field(default_factory=list)

    @classmethod
    def from_response(cls, data: dict[str, Any]) -> "SpaceModel":
        """
        Build a space, and the items nested in it, from the platform response.

        Parameters
        ----------
        data : dict
            One space, as the platform returned it.

        Returns
        -------
        SpaceModel
            The space, with its items.
        """
        uid = data.get("uid", "")
        name = data.get("name_t") or data.get("name") or ""
        space = cls(
            uid=uid,
            name=name,
            handle=data.get("handle_s") or data.get("handle") or "",
            description=data.get("description_t") or data.get("description") or "",
        )
        # Items come back nested in the space, so listing spaces already
        # answers "what is in them" without a call per space.
        space.items = [
            ItemModel.from_response(item, space_uid=uid, space_name=name)
            for item in (data.get("items") or [])
        ]
        return space

    def notebooks(self) -> list[ItemModel]:
        """
        The notebooks in this space.

        Returns
        -------
        list[ItemModel]
            Only the items the platform typed as notebooks.
        """
        return [item for item in self.items if item.is_notebook()]

    def __str__(self) -> str:
        return f"{self.name} ({self.uid})"
