# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer secrets management."""

from datalayer_core.cliapp.secrets.create.createapp import SecretsCreateMixin
from datalayer_core.cliapp.secrets.delete.deleteapp import SecretsDeleteMixin
from datalayer_core.cliapp.secrets.list.listapp import SecretsListMixin


class SecretsMixin(SecretsCreateMixin, SecretsDeleteMixin, SecretsListMixin):
    """A mixin that combines create, delete, and list functionalities for secrets."""


__all__ = [
    "SecretsCreateMixin",
]
