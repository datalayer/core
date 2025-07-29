# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# PYTHON_ARGCOMPLETE_OK
"""
Migrating IPython < 4.0 to Datalayer.

This *copies* configuration and resources to their new locations in Datalayer.

Migrations:

- .ipython/
  - nbextensions -> DATALAYER_DATA_DIR/nbextensions
  - kernels ->  DATALAYER_DATA_DIR/kernels

- .ipython/profile_default/
  - static/custom -> .datalayer/custom
  - nbconfig -> .datalayer/nbconfig
  - security/

    - notebook_secret, notebook_cookie_secret, nbsignatures.db -> DATALAYER_DATA_DIR

  - ipython_{notebook,nbconvert,qtconsole}_config.py -> .datalayer/datalayer_{name}_config.py
"""

# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import os
import re
import shutil
from datetime import datetime, timezone
from typing import Any, Optional

from traitlets.config.loader import JSONFileConfigLoader, PyFileConfigLoader
from traitlets.log import get_logger

from .application import DatalayerApp
from .paths import datalayer_config_dir, datalayer_data_dir
from .utils import ensure_dir_exists

pjoin = os.path.join

migrations = {
    pjoin("{ipython_dir}", "nbextensions"): pjoin("{datalayer_data}", "nbextensions"),
    pjoin("{ipython_dir}", "kernels"): pjoin("{datalayer_data}", "kernels"),
    pjoin("{profile}", "nbconfig"): pjoin("{datalayer_config}", "nbconfig"),
}

custom_src_t = pjoin("{profile}", "static", "custom")
custom_dst_t = pjoin("{datalayer_config}", "custom")

for security_file in ("notebook_secret", "notebook_cookie_secret", "nbsignatures.db"):
    src = pjoin("{profile}", "security", security_file)
    dst = pjoin("{datalayer_data}", security_file)
    migrations[src] = dst

config_migrations = ["notebook", "nbconvert", "qtconsole"]

regex = re.compile

config_substitutions = {
    regex(r"\bIPythonQtConsoleApp\b"): "DatalayerQtConsoleApp",
    regex(r"\bIPythonWidget\b"): "DatalayerWidget",
    regex(r"\bRichIPythonWidget\b"): "RichDatalayerWidget",
    regex(r"\bIPython\.html\b"): "notebook",
    regex(r"\bIPython\.nbconvert\b"): "nbconvert",
}


def get_ipython_dir() -> str:
    """
    Return the IPython directory location.

    Not imported from IPython because the IPython implementation
    ensures that a writable directory exists,
    creating a temporary directory if not.
    We don't want to trigger that when checking if migration should happen.

    We only need to support the IPython < 4 behavior for migration,
    so importing for forward-compatibility and edge cases is not important.

    Returns
    -------
    str
        The path to the IPython directory.
    """
    return os.environ.get("IPYTHONDIR", os.path.expanduser("~/.ipython"))


def migrate_dir(src: str, dst: str) -> bool:
    """
    Migrate a directory from src to dst.

    Parameters
    ----------
    src : str
        The source directory.
    dst : str
        The destination directory.

    Returns
    -------
    bool
        `True` if the migration was successful, `False` otherwise.
    """
    log = get_logger()
    if not os.listdir(src):
        log.debug("No files in %s", src)
        return False
    if os.path.exists(dst):
        if os.listdir(dst):
            # already exists, non-empty
            log.debug("%s already exists", dst)
            return False
        else:
            os.rmdir(dst)
    log.info("Copying %s -> %s", src, dst)
    ensure_dir_exists(os.path.dirname(dst))
    shutil.copytree(src, dst, symlinks=True)
    return True


def migrate_file(
    src: str, dst: str, substitutions: Optional[dict[Any, Any]] = None
) -> bool:
    """
    Migrate a single file from src to dst.

    substitutions is an optional dict of {regex: replacement} for performing replacements on the file.

    Parameters
    ----------
    src : str
        The source file.
    dst : str
        The destination file.
    substitutions : Optional[dict[Any, Any]]
        A dictionary of regex patterns and their replacements.

    Returns
    -------
    bool
        `True` if the migration was successful, `False` otherwise.
    """
    log = get_logger()
    if os.path.exists(dst):
        # already exists
        log.debug("%s already exists", dst)
        return False
    log.info("Copying %s -> %s", src, dst)
    ensure_dir_exists(os.path.dirname(dst))
    shutil.copy(src, dst)
    if substitutions:
        with open(dst, encoding="utf-8") as f:
            text = f.read()
        for pat, replacement in substitutions.items():
            text = pat.sub(replacement, text)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(text)
    return True


def migrate_one(src: str, dst: str) -> bool:
    """
    Migrate one item.

    dispatches to migrate_dir/_file

    Parameters
    ----------
    src : str
        The source path.
    dst : str
        The destination path.

    Returns
    -------
    bool
        `True` if the migration was successful, `False` otherwise.
    """
    log = get_logger()
    if os.path.isfile(src):
        return migrate_file(src, dst)
    elif os.path.isdir(src):
        return migrate_dir(src, dst)
    else:
        log.debug("Nothing to migrate for %s", src)
        return False


def migrate_static_custom(src: str, dst: str) -> bool:
    """
    Migrate non-empty custom.js,css from src to dst.

    src, dst are 'custom' directories containing custom.{js,css}

    Parameters
    ----------
    src : str
        The source directory.
    dst : str
        The destination directory.

    Returns
    -------
    bool
        True if any files were migrated, False otherwise.
    """
    log = get_logger()
    migrated = False

    custom_js = pjoin(src, "custom.js")
    custom_css = pjoin(src, "custom.css")
    # check if custom_js is empty:
    custom_js_empty = True
    if os.path.isfile(custom_js):
        with open(custom_js, encoding="utf-8") as f:
            js = f.read().strip()
            for line in js.splitlines():
                if not (line.isspace() or line.strip().startswith(("/*", "*", "//"))):
                    custom_js_empty = False
                    break

    # check if custom_css is empty:
    custom_css_empty = True
    if os.path.isfile(custom_css):
        with open(custom_css, encoding="utf-8") as f:
            css = f.read().strip()
            custom_css_empty = css.startswith("/*") and css.endswith("*/")

    if custom_js_empty:
        log.debug("Ignoring empty %s", custom_js)
    if custom_css_empty:
        log.debug("Ignoring empty %s", custom_css)

    if custom_js_empty and custom_css_empty:
        # nothing to migrate
        return False
    ensure_dir_exists(dst)

    if not custom_js_empty or not custom_css_empty:
        ensure_dir_exists(dst)

    if not custom_js_empty and migrate_file(custom_js, pjoin(dst, "custom.js")):
        migrated = True
    if not custom_css_empty and migrate_file(custom_css, pjoin(dst, "custom.css")):
        migrated = True

    return migrated


def migrate_config(name: str, env: dict[str, Any]) -> list[str]:
    """
    Migrate a config file.

    Includes substitutions for updated configurable names.

    Parameters
    ----------
    name : str
        The name of the config file (without extension).
    env : dict[str, Any]
        The environment variables to use for path expansion.

    Returns
    -------
    list[str]
        A list of migrated config file paths.
    """
    log = get_logger()
    src_base = pjoin("{profile}", "ipython_{name}_config").format(name=name, **env)
    dst_base = pjoin("{datalayer_config}", "datalayer_{name}_config").format(
        name=name, **env
    )
    loaders = {
        ".py": PyFileConfigLoader,
        ".json": JSONFileConfigLoader,
    }
    migrated = []
    for ext in (".py", ".json"):
        src = src_base + ext
        dst = dst_base + ext
        if os.path.exists(src):
            cfg = loaders[ext](src).load_config()
            if cfg:
                if migrate_file(src, dst, substitutions=config_substitutions):
                    migrated.append(src)
            else:
                # don't migrate empty config files
                log.debug("Not migrating empty config file: %s", src)
    return migrated


def migrate() -> bool:
    """
    Migrate IPython configuration to Datalayer.

    Returns
    -------
    bool
        `True` if any files were migrated, `False` otherwise.
    """
    env = {
        "datalayer_data": datalayer_data_dir(),
        "datalayer_config": datalayer_config_dir(),
        "ipython_dir": get_ipython_dir(),
        "profile": os.path.join(get_ipython_dir(), "profile_default"),
    }
    migrated = False
    for src_t, dst_t in migrations.items():
        src = src_t.format(**env)
        dst = dst_t.format(**env)
        if os.path.exists(src) and migrate_one(src, dst):
            migrated = True

    for name in config_migrations:
        if migrate_config(name, env):
            migrated = True

    custom_src = custom_src_t.format(**env)
    custom_dst = custom_dst_t.format(**env)

    if os.path.exists(custom_src) and migrate_static_custom(custom_src, custom_dst):
        migrated = True

    # write a marker to avoid re-running migration checks
    ensure_dir_exists(env["datalayer_config"])
    with open(
        os.path.join(env["datalayer_config"], "migrated"), "w", encoding="utf-8"
    ) as f:
        f.write(datetime.now(tz=timezone.utc).isoformat())

    return migrated


class DatalayerMigrate(DatalayerApp):
    """A Datalayer Migration App."""

    name = "datalayer-migrate"
    description = """
    Migrate configuration and data from .ipython prior to 4.0 to Datalayer locations.

    This migrates:

    - config files in the default profile
    - kernels in ~/.ipython/kernels
    - notebook javascript extensions in ~/.ipython/extensions
    - custom.js/css to .datalayer/custom

    to their new Datalayer locations.

    All files are copied, not moved.
    If the destinations already exist, nothing will be done.
    """

    def start(self) -> None:
        """Start the application."""
        if not migrate():
            self.log.info("Found nothing to migrate.")


main = launch_new_instance = DatalayerMigrate.launch_instance


if __name__ == "__main__":
    main()
