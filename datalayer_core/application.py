# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
A base Application class for Datalayer applications.

All Datalayer applications should inherit from this.
"""

import logging
import os
import sys
import typing as t
from copy import deepcopy
from shutil import which

from traitlets import Bool, List, Unicode, observe
from traitlets.config.application import Application, catch_config_error
from traitlets.config.loader import ConfigFileNotFound

from .paths import (
    allow_insecure_writes,
    datalayer_config_dir,
    datalayer_config_path,
    datalayer_data_dir,
    datalayer_path,
    datalayer_runtime_dir,
    issue_insecure_write_warning,
)
from .utils import ensure_dir_exists

# aliases and flags

base_aliases: dict[str, str] = {}
if isinstance(Application.aliases, dict):
    # traitlets 5
    base_aliases.update(Application.aliases)
_datalayer_aliases = {
    "log-level": "Application.log_level",
    "config": "DatalayerApp.config_file",
}
base_aliases.update(_datalayer_aliases)

base_flags: dict[str, t.Any] = {}
if isinstance(Application.flags, dict):
    # traitlets 5
    base_flags.update(Application.flags)
_datalayer_flags: dict[str, t.Any] = {
    "debug": (
        {"Application": {"log_level": logging.DEBUG}},
        "set log level to logging.DEBUG (maximize logging output)",
    ),
    "generate-config": (
        {"DatalayerApp": {"generate_config": True}},
        "generate default config file",
    ),
    "y": (
        {"DatalayerApp": {"answer_yes": True}},
        "Answer yes to any questions instead of prompting.",
    ),
}
base_flags.update(_datalayer_flags)


class NoStart(Exception):  # noqa
    """Exception to raise when an application shouldn't start."""


class DatalayerApp(Application):
    """Base class for Datalayer applications."""

    name = "datalayer_core"  # override in subclasses
    description = "A Datalayer Application"

    aliases = base_aliases
    flags = base_flags

    def _log_level_default(self) -> int:
        """
        Get the default log level.

        Returns
        -------
        int
            Default log level.
        """
        return logging.INFO

    datalayer_path: t.Union[t.List[str], List] = List(Unicode())

    def _datalayer_path_default(self) -> List[str]:
        """
        Get the default datalayer path.

        Returns
        -------
        List[str]
            Default datalayer path.
        """
        return datalayer_path()

    config_dir: t.Union[str, Unicode] = Unicode()

    def _config_dir_default(self) -> str:
        """
        Get the default config directory.

        Returns
        -------
        str
            Default config directory path.
        """
        return datalayer_config_dir()

    @property
    def config_file_paths(self) -> List[str]:
        """
        Get the configuration file paths.

        Returns
        -------
        List[str]
            List of configuration file paths.
        """
        path = datalayer_config_path()
        if self.config_dir not in path:
            # Insert config dir as first item.
            path.insert(0, self.config_dir)
        return path

    data_dir: t.Union[str, Unicode] = Unicode()

    def _data_dir_default(self) -> str:
        """
        Get the default data directory.

        Returns
        -------
        str
            Default data directory path.
        """
        d = datalayer_data_dir()
        ensure_dir_exists(d, mode=0o700)
        return d

    runtime_dir: t.Union[str, Unicode] = Unicode()

    def _runtime_dir_default(self) -> str:
        """
        Get the default runtime directory.

        Returns
        -------
        str
            Default runtime directory path.
        """
        rd = datalayer_runtime_dir()
        ensure_dir_exists(rd, mode=0o700)
        return rd

    @observe("runtime_dir")
    def _runtime_dir_changed(self, change: dict[str, t.Any]) -> None:
        """
        Handle runtime directory changes.

        Parameters
        ----------
        change : dict[str, Any]
            The change notification dictionary.
        """
        ensure_dir_exists(change["new"], mode=0o700)

    generate_config: t.Union[bool, Bool] = Bool(
        False, config=True, help="""Generate default config file."""
    )

    config_file_name: t.Union[str, Unicode] = Unicode(
        config=True, help="Specify a config file to load."
    )

    def _config_file_name_default(self) -> str:
        """
        Get the default config file name.

        Returns
        -------
        str
            Default config file name.
        """
        if not self.name:
            return ""
        return self.name.replace("-", "_") + "_config"

    config_file: t.Union[str, Unicode] = Unicode(
        config=True,
        help="""Full path of a config file.""",
    )

    answer_yes: t.Union[bool, Bool] = Bool(
        False, config=True, help="""Answer yes to any prompts."""
    )

    def write_default_config(self) -> None:
        """Write our default config to a .py config file."""
        if self.config_file:
            config_file = self.config_file
        else:
            config_file = os.path.join(self.config_dir, self.config_file_name + ".py")

        if os.path.exists(config_file) and not self.answer_yes:
            answer = ""

            def ask() -> str:
                prompt = "Overwrite %s with default config? [y/N]" % config_file
                try:
                    return input(prompt).lower() or "n"
                except KeyboardInterrupt:
                    print("")  # empty line
                    return "n"

            answer = ask()
            while not answer.startswith(("y", "n")):
                print("Please answer 'yes' or 'no'")
                answer = ask()
            if answer.startswith("n"):
                return

        config_text = self.generate_config_file()
        if isinstance(config_text, bytes):
            config_text = config_text.decode("utf8")
        print("Writing default config to: %s" % config_file)
        ensure_dir_exists(os.path.abspath(os.path.dirname(config_file)), 0o700)
        with open(config_file, mode="w", encoding="utf-8") as f:
            f.write(config_text)

    def migrate_config(self) -> None:
        """Migrate config/data from IPython 3."""
        try:  # let's see if we can open the marker file
            # for reading and updating (writing)
            f_marker = open(os.path.join(self.config_dir, "migrated"), "r+")  # noqa
        except PermissionError:  # not readable and/or writable
            return  # so let's give up migration in such an environment
        except FileNotFoundError:  # cannot find the marker file
            pass  # that means we have not migrated yet, so continue
        else:  # if we got here without raising anything,
            # that means the file exists
            f_marker.close()
            return  # so we must have already migrated -> bail out

        from .migrate import get_ipython_dir, migrate

        # No IPython dir, nothing to migrate
        if not os.path.exists(get_ipython_dir()):
            return

        migrate()

    def load_config_file(self, suppress_errors: bool = True) -> None:
        """
        Load the config file.

        By default, errors in loading config are handled, and a warning
        printed on screen. For testing, the suppress_errors option is set
        to False, so errors will make tests fail.

        Parameters
        ----------
        suppress_errors : bool, default True
            Whether to suppress configuration loading errors.
        """
        self.log.debug("Searching %s for config files", self.config_file_paths)
        base_config = "datalayer_config"
        try:
            super().load_config_file(
                base_config,
                path=self.config_file_paths,
            )
        except ConfigFileNotFound:
            # ignore errors loading parent
            self.log.debug("Config file %s not found", base_config)

        if self.config_file:
            path, config_file_name = os.path.split(self.config_file)
        else:
            path = self.config_file_paths
            config_file_name = self.config_file_name

            if not config_file_name or (config_file_name == base_config):
                return

        try:
            super().load_config_file(config_file_name, path=path)
        except ConfigFileNotFound:
            self.log.debug("Config file not found, skipping: %s", config_file_name)
        except Exception:
            # Reraise errors for testing purposes, or if set in
            # self.raise_config_file_errors
            if (not suppress_errors) or self.raise_config_file_errors:
                raise
            self.log.warning(
                "Error loading config file: %s", config_file_name, exc_info=True
            )

    # subcommand-related
    def _find_subcommand(self, name: str) -> t.Optional[str]:
        """
        Find a subcommand by name.

        Parameters
        ----------
        name : str
            The subcommand name to find.

        Returns
        -------
        Optional[str]
            Path to the subcommand executable or None if not found.
        """
        name = f"{self.name}-{name}"
        return which(name)

    @property
    def _dispatching(self) -> bool:
        """
        Return whether we are dispatching to another command or running ourselves.

        Returns
        -------
        bool
            True if dispatching to another command, False otherwise.
        """
        return bool(self.generate_config or self.subapp or self.subcommand)

    subcommand = Unicode()

    @catch_config_error
    def initialize(self, argv: t.Optional[list[str]] = None) -> None:
        """
        Initialize the application.

        Parameters
        ----------
        argv : Optional[list[str]], default None
            Command line arguments.
        """
        # don't hook up crash handler before parsing command-line
        if argv is None:
            argv = sys.argv[1:]
        if argv:
            subc = self._find_subcommand(argv[0])
            if subc:
                self.argv = argv
                self.subcommand = subc
                return
        self.parse_command_line(argv)
        cl_config = deepcopy(self.config)
        if self._dispatching:
            return
        self.migrate_config()
        self.load_config_file()
        # enforce cl-opts override configfile opts:
        self.update_config(cl_config)
        if allow_insecure_writes:
            issue_insecure_write_warning()

    def start(self) -> None:
        """Start the whole thing."""
        if self.subcommand:
            os.execv(self.subcommand, [self.subcommand] + self.argv[1:])  # noqa
            raise NoStart()

        if self.subapp:
            self.subapp.start()
            raise NoStart()

        if self.generate_config:
            self.write_default_config()
            raise NoStart()

    @classmethod
    def launch_instance(
        cls, argv: t.Optional[t.Tuple[t.Any]] = None, **kwargs: t.Dict[str, t.Any]
    ) -> None:
        """
        Launch an instance of a Datalayer Application.

        Parameters
        ----------
        argv : Optional[Tuple[Any]], default None
            Command line arguments.
        **kwargs : Dict[str, Any]
            Additional keyword arguments.

        Returns
        -------
        None
            This method does not return a value.
        """
        try:
            return super().launch_instance(argv=argv, **kwargs)
        except NoStart:
            return


if __name__ == "__main__":
    DatalayerApp.launch_instance()
