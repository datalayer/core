# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Decorators to execute functions in a Datalayer runtimes.
"""

import functools
import inspect
from typing import Any, Callable, Optional, Union

from typing_extensions import TypeAlias

from datalayer_core.sdk.client import DEFAULT_ENVIRONMENT, DatalayerClient

# TODO:
# - inputs are different from args and kwargs (rename)
# - inputs cannot be kewyword args of the function
# - incorrect number of args


Seconds: TypeAlias = float
CallableOrOptionalString: TypeAlias = Union[Callable[..., Any], Optional[str]]


def datalayer(
    runtime_name: CallableOrOptionalString = None,
    environment: str = DEFAULT_ENVIRONMENT,
    inputs: Optional[list[str]] = None,
    output: Optional[str] = None,
    snapshot_name: Optional[str] = None,
    debug: bool = True,
    timeout: Seconds = 10.0,
) -> Any:
    """
    Decorator to execute a function in a Datalayer runtime.

    Parameters
    ----------
    runtime_name : str, optional
        The name of the runtime to use. If not provided, a default runtime will be used.
    environment : str, optional
        The name of the environment to use. If not provided, a default environment will be used.
    inputs : list[str], optional
        A list of input variable names for the function.
    output : str, optional
        The name of the output variable for the function.
    snapshot_name : str, optional
        The name of the runtime snapshot to use.
    debug : bool
        Whether to enable debug mode. If `True`, the output and error streams will be printed.
    timeout : Seconds
        Timeout for the execution.

    Returns
    -------
    Callable[..., Any]
        A decorator that wraps the function to be executed in a Datalayer runtime.

    Examples
    --------

    >>> from datalayer_core.sdk.decorators import datalayer
    >>> @datalayer
    ... def example(x: float, y: float) -> float:
    ...     return x + y

    >>> from datalayer_core.sdk.decorators import datalayer
    >>> @datalayer(runtime_name="example-runtime", inputs=["x", "y"], output="z")
    ... def example(x: float, y: float) -> float:
    ...     return x + y
    """
    variables = {}
    inputs_decorated = inputs
    output_decorated = output
    snapshot_name_decorated = snapshot_name

    if callable(runtime_name):
        runtime_name_decorated = None
    else:
        runtime_name_decorated = runtime_name

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        """
        Decorator function to wrap the original function.

        This function prepares the inputs and executes the function in the specified runtime.

        Parameters
        ----------
        func : Callable[..., Any]
            The function to be decorated.

        Returns
        -------
        Callable[..., Any]
            The wrapped function.
        """
        if output_decorated is None:
            output = f"DATALAYER_RUNTIME_OUTPUT_{func.__name__}".upper()

        sig = inspect.signature(func)
        if inputs_decorated is None:
            inputs = []
            for name, _param in sig.parameters.items():
                inputs.append(name)
                variables[name] = (
                    _param.default
                    if _param.default is not inspect.Parameter.empty
                    else None
                )
        else:
            if len(sig.parameters) != len(inputs_decorated):
                raise ValueError(
                    f"Function {func.__name__} has {len(sig.parameters)} parameters, "
                    f"but {len(inputs_decorated)} inputs were provided."
                )

        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            """
            Wrapper function to execute the decorated function in a Datalayer runtime.

            This function prepares the inputs and executes the function in the specified runtime.

            Parameters
            ----------
            *args : Any
                Positional arguments for the function.
            **kwargs : Any
                Keyword arguments for the function.

            Returns
            -------
            Any
                The result of the function execution.
            """
            sig = inspect.signature(func)
            mapping = {}
            for idx, (name, _param) in enumerate(sig.parameters.items()):
                mapping[name] = (inputs_decorated or inputs)[idx]

            for kwarg, kwarg_value in kwargs.items():
                variables[mapping[kwarg]] = kwarg_value

            for idx, (arg_value) in enumerate(args):
                kwarg = (inputs_decorated or inputs)[idx]
                variables[kwarg] = arg_value

            function_call = (
                f"{output_decorated or output} = {func.__name__}("
                + ", ".join(inputs_decorated or inputs)
                + ")"
            )

            start = 0
            func_source_lines = inspect.getsource(func).split("\n")
            for start, line in enumerate(func_source_lines):
                if line.startswith("def "):
                    break
            function_source = "\n".join(func_source_lines[start:])

            # print("inputs", inputs_decorated or inputs)
            # print("variables", variables)
            # print([function_source])
            # print([function_call])

            client = DatalayerClient()
            with client.create_runtime(
                name=runtime_name_decorated,
                snapshot_name=snapshot_name_decorated,
                environment=environment,
            ) as runtime:
                runtime.execute(
                    function_source,
                    debug=debug,
                    timeout=timeout,
                )
                return runtime.execute(
                    function_call,
                    variables=variables,
                    output=output_decorated or output,
                    debug=debug,
                    timeout=timeout,
                )

        return wrapper

    # print(f"Using runtime: {runtime_name}, inputs: {inputs}, output: {output}")
    if callable(runtime_name):
        return decorator(runtime_name)
    else:
        return decorator
