---
sidebar_label: paths
title: paths
---

Path utility functions.

#### envset

```python
def envset(name: str, default: Optional[bool] = False) -> Optional[bool]
```

"Return the boolean value of a given environment variable.\n\nAn environment variable is considered set if it is assigned to a value\nother than 'no', 'n', 'false', 'off', '0', or '0.0' (case insensitive\n\nIf the environment variable is not defined, the default value is returned.&quot;)

#### use\_platform\_dirs

```python
def use_platform_dirs() -> bool
```

Determine if platformdirs should be used for system-specific paths.\n\nWe plan for this to default to False in datalayer version 5 and to True\nin datalayer version 6.

#### get\_home\_dir

```python
def get_home_dir() -> str
```

Get the real path of the home directory

#### prefer\_environment\_over\_user

```python
def prefer_environment_over_user() -> bool
```

Determine if environment-level paths should take precedence over user-level paths.

#### datalayer\_config\_dir

```python
def datalayer_config_dir() -> str
```

Get the Datalayer config directory for this platform and user.\n\nReturns DATALAYER_CONFIG_DIR if defined, otherwise the appropriate\ndirectory for the platform.

#### datalayer\_data\_dir

```python
def datalayer_data_dir() -> str
```

Get the config directory for Datalayer data files for this platform and user.\n\nThese are non-transient, non-configuration files.\n\nReturns DATALAYER_DATA_DIR if defined, else a platform-appropriate path.

#### datalayer\_runtime\_dir

```python
def datalayer_runtime_dir() -> str
```

'Return the runtime dir for transient datalayer files.\n\nReturns DATALAYER_RUNTIME_DIR if defined.\n\nThe default is now (data_dir/runtime on all platforms;\nwe no longer use XDG_RUNTIME_DIR after various problems.&#x27;)

#### datalayer\_path

```python
def datalayer_path(*subdirs: str) -> List[str]
```

"Return a list of directories to search for data files\n\nDATALAYER_PATH environment variable has highest priority.\n\nIf the DATALAYER_PREFER_ENV_PATH environment variable is set, the environment-level\ndirectories will have priority over user-level directories.\n\nIf the Python site.ENABLE_USER_SITE variable is True, we also add the\nappropriate Python user site subdirectory to the user-level directories.\n\n\nIf ``*subdirs`` are given, that subdirectory will be added to each element.\n\n**Examples**:\n\n  \n  >>> datalayer_path(\n  [&#x27;~/.local/datalayer&#x27;, &#x27;/usr/local/share/datalayer&#x27;]\n  &gt;&gt;&gt; datalayer_path(&#x27;kernels&#x27;)\n  [&#x27;~/.local/datalayer/kernels&#x27;, &#x27;/usr/local/share/datalayer/kernels&#x27;]&quot;)

#### datalayer\_config\_path

```python
def datalayer_config_path() -> List[str]
```

Return the search path for Datalayer config files as a list.\n\nIf the DATALAYER_PREFER_ENV_PATH environment variable is set, the\nenvironment-level directories will have priority over user-level\ndirectories.\n\nIf the Python site.ENABLE_USER_SITE variable is True, we also add the\nappropriate Python user site subdirectory to the user-level directories.

#### exists

```python
def exists(path: str) -> bool
```

Replacement for `os.path.exists` which works for host mapped volumes\non Windows containers

#### is\_file\_hidden\_win

```python
def is_file_hidden_win(abs_path: str, stat_res: Optional[Any] = None) -> bool
```

'Is a file hidden?\n\nThis only checks the file itself; it should be called in combination with\nchecking the directory containing the file.\n\nUse is_hidden( instead to check the file and its parent directories.\n\nParameters\n----------\nabs_path : unicode\n    The absolute path to check.\nstat_res : os.stat_result, optional\n    The result of calling stat() on abs_path. If not passed, this function\n    will call stat() internally.&#x27;)

#### is\_file\_hidden\_posix

```python
def is_file_hidden_posix(abs_path: str,
                         stat_res: Optional[Any] = None) -> bool
```

'Is a file hidden?\n\nThis only checks the file itself; it should be called in combination with\nchecking the directory containing the file.\n\nUse is_hidden( instead to check the file and its parent directories.\n\nParameters\n----------\nabs_path : unicode\n    The absolute path to check.\nstat_res : os.stat_result, optional\n    The result of calling stat() on abs_path. If not passed, this function\n    will call stat() internally.&#x27;)

#### is\_hidden

```python
def is_hidden(abs_path: str, abs_root: str = "") -> bool
```

Is a file hidden or contained in a hidden directory?\n\nThis will start with the rightmost path element and work backwards to the\ngiven root to see if a path is hidden or in a hidden directory. Hidden is\ndetermined by either name starting with '.' or the UF_HIDDEN flag as\nreported by stat.\n\nIf abs_path is the same directory as abs_root, it will be visible even if\nthat is a hidden folder. This only checks the visibility of files\nand directories *within* abs_root.\n\nParameters\n----------\nabs_path : unicode\n    The absolute path to check for hidden directories.\nabs_root : unicode\n    The absolute path of the root directory in which hidden directories\n    should be checked for.

#### win32\_restrict\_file\_to\_user

```python
def win32_restrict_file_to_user(fname: str) -> None
```

Secure a windows file to read-only access for the user.\nFollows guidance from win32 library creator:\nhttp://timgolden.me.uk/python/win32_how_do_i/add-security-to-a-file.html\n\nThis method should be executed against an already generated file which\nhas no secrets written to it yet.\n\nParameters\n----------\n\nfname : unicode\n    The path to the file to secure

#### get\_file\_mode

```python
def get_file_mode(fname: str) -> int
```

Retrieves the file mode corresponding to fname in a filesystem-tolerant manner.\n\nParameters\n----------\n\nfname : unicode\n    The path to the file to get mode from

#### secure\_write

```python
@contextmanager
def secure_write(fname: str, binary: bool = False) -> Iterator[Any]
```

Opens a file in the most restricted pattern available for\nwriting content. This limits the file mode to `0o0600` and yields\nthe resulting opened filed handle.\n\nParameters\n----------\n\nfname : unicode\n    The path to the file to write\n\nbinary: boolean\n    Indicates that the file is binary

#### issue\_insecure\_write\_warning

```python
def issue_insecure_write_warning() -> None
```

Issue an insecure write warning.

