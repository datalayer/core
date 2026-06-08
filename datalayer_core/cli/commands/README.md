# Exec Module

The `exec` module provides functionality to execute Python files and Jupyter notebooks on Datalayer runtimes.

## Commands

### `dla exec`

Execute a Python file or Jupyter notebook on a Datalayer runtime.

**Usage:**
```bash
dla exec <filename> [options]
dla exec --example-py [options]
dla exec --example-notebook [options]
```

**Arguments:**
- `filename`: Path to the Python file (.py) or Jupyter notebook (.ipynb) to execute (optional when using `--example-py` or `--example-notebook`)

**Options:**
- `--runtime, -r`: Name of the runtime to execute on (required)
- `--verbose, -v`: Show all cell outputs (default: false, outputs are suppressed)
- `--timeout, -t`: Execution timeout for each cell in seconds
- `--raise`: Stop executing if an exception occurs (default: continue on errors)
- `--example-py`: Create and execute a temporary example Python file
- `--example-notebook`: Create and execute a temporary example notebook

**Examples:**
```bash
# Execute a Python script on a runtime
dla exec script.py --runtime my-runtime

# Execute an auto-generated Python example
dla exec --example-py --runtime my-runtime

# Execute an auto-generated notebook example
dla exec --example-notebook

# Execute a Jupyter notebook with verbose output
dla exec notebook.ipynb --runtime my-runtime --verbose

# Execute with timeout and stop on errors
dla exec script.py --runtime my-runtime --timeout 30 --raise
```

## File Support

The exec module supports:

- **Python files (.py)**: The entire file content is executed as a single cell
- **Jupyter notebooks (.ipynb)**: Each code cell is executed sequentially, markdown cells are skipped

## Runtime Connection

The exec module uses the modern `DatalayerClient` and `RuntimeManager` to:

1. Connect to the specified runtime
2. Start a kernel session
3. Execute cells sequentially
4. Handle interrupts (Ctrl+C) gracefully
5. Clean up resources after execution

## Error Handling

- File validation (existence, readability)
- Runtime connection errors
- Cell execution errors (can continue or stop based on `--raise` flag)
- Proper cleanup on interruption or failure

## Implementation

The exec functionality is implemented in:
- `datalayer_core/cli/exec/exec.py`: Main Typer-based CLI commands
- Uses `datalayer_core/utils/notebook.get_cells()` for file parsing
- Uses `datalayer_core/cli/console/manager.RuntimeManager` for runtime connection
- Integrates with the main CLI via `datalayer_core/cli/__main__.py`
