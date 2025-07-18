# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datalayer_core.secrets.create.createapp import SecretsCreateMixin, SecretType
from datalayer_core.secrets.delete.deleteapp import SecretsDeleteMixin
from datalayer_core.secrets.list.listapp import SecretsListMixin


class SecretsMixin(SecretsCreateMixin, SecretsDeleteMixin, SecretsListMixin):
    """A mixin that combines create, delete, and list functionalities for secrets."""


__all__ = [
    "SecretsCreateMixin",
    "SecretType",
]
