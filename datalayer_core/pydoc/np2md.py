# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path

from npdoc_to_md import render_file

HERE = Path(__file__).parent
DOCS = HERE.parent.parent / "docs" / "docs" / "python_api" / "sdk"

render_file(source=HERE / "template.np", destination=DOCS / "index.md")


with open(DOCS / "index.md", "r") as f:
    data = f.read()
    data = data.replace(' style="color:purple"', ' style={{color:"purple"}}')


with open(DOCS / "index.md", "w") as f:
    f.write(data)
