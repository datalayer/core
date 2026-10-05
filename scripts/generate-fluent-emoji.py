#!/usr/bin/env python3
# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Write the Fluent Emoji drawings of the faces Datalayer offers (LOOP T-20).

Reads the emojis between the ``fluent-emoji:start`` and ``fluent-emoji:end``
markers of ``src/components/emoji/faceEmojis.ts``, finds each in Microsoft's
Fluent Emoji (MIT) at a pinned commit by the unicode its metadata gives, and
writes its *Flat* drawing as a module of its own under
``src/components/emoji/fluent/svg/`` -- fetched on first draw, from
Datalayer's own bundle -- with ``loaders.ts`` naming them all and the licence
beside them. An emoji Fluent does not draw stops the script.

Run from the repository's root::

    python scripts/generate-fluent-emoji.py [--cache DIR]
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

REPO = "microsoft/fluentui-emoji"
COMMIT = "1ffb34c752ecf5d402f04cfb4b392c77f57c54bc"
RAW = f"https://raw.githubusercontent.com/{REPO}/{COMMIT}/"
TREE = f"https://api.github.com/repos/{REPO}/git/trees/{COMMIT}?recursive=1"

ROOT = Path(__file__).resolve().parent.parent
LIST = ROOT / "src/components/emoji/faceEmojis.ts"
OUT = ROOT / "src/components/emoji/fluent"


def fetch(url: str) -> bytes:
    """
    Fetch a URL of GitHub's.

    Parameters
    ----------
    url : str
        The URL, at the pinned commit.

    Returns
    -------
    bytes
        Its body.
    """
    with urllib.request.urlopen(url, timeout=60) as response:  # nosec B310
        return response.read()


def cached(cache: Path | None, name: str, url: str) -> bytes:
    """
    Fetch a URL once, keeping it under ``cache`` when one is given.

    Parameters
    ----------
    cache : Path or None
        Where to keep what was fetched.
    name : str
        The file it is kept as.
    url : str
        The URL.

    Returns
    -------
    bytes
        Its body.
    """
    if cache is None:
        return fetch(url)
    path = cache / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(fetch(url))
    return path.read_bytes()


def key_of(codes: list[int]) -> str:
    """
    Name a drawing as ``emojiKey`` does in ``faceEmojis.ts``.

    Parameters
    ----------
    codes : list of int
        The emoji's code points.

    Returns
    -------
    str
        Lower-case hexadecimal code points joined by ``-``, without U+FE0F.
    """
    return "-".join(f"{code:x}" for code in codes if code != 0xFE0F)


def main() -> None:
    """Write the drawings, their loaders and the licence."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--cache", type=Path, help="keep what is fetched here")
    args = parser.parse_args()

    text = LIST.read_text(encoding="utf-8")
    block = text.split("// fluent-emoji:start", 1)[1].split("// fluent-emoji:end", 1)[0]
    emojis = re.findall(r"^\s*'([^']+)',", block, flags=re.M)
    keys = list(dict.fromkeys(key_of([ord(c) for c in emoji]) for emoji in emojis))

    tree = json.loads(cached(args.cache, "tree.json", TREE))["tree"]
    paths = [item["path"] for item in tree if item["type"] == "blob"]
    metadata = [p for p in paths if p.count("/") == 2 and p.endswith("/metadata.json")]

    def read(path: str) -> tuple[str, dict]:
        name = "meta/" + path.split("/")[1] + ".json"
        return path.split("/")[1], json.loads(cached(args.cache, name, RAW + urllib.parse.quote(path)))

    with concurrent.futures.ThreadPoolExecutor(16) as pool:
        folders = dict(pool.map(read, metadata))
    by_key = {
        key_of([int(code, 16) for code in meta.get("unicode", "").split()]): (folder, meta)
        for folder, meta in folders.items()
    }

    missing = [key for key in keys if key not in by_key]
    if missing:
        raise SystemExit(f"Fluent Emoji draws none of: {', '.join(missing)}")

    (OUT / "svg").mkdir(parents=True, exist_ok=True)
    for stale in (OUT / "svg").glob("*.ts"):
        stale.unlink()
    (OUT / "LICENSE").write_bytes(cached(args.cache, "LICENSE", RAW + "LICENSE"))

    loaders = []
    for key in keys:
        folder, meta = by_key[key]
        # The one drawing, or, for an emoji with skin tones, the default's.
        flat = [
            p
            for p in paths
            if p.startswith(f"assets/{folder}/Flat/")
            or p.startswith(f"assets/{folder}/Default/Flat/")
        ]
        flat = [p for p in flat if p.endswith(".svg")]
        if len(flat) != 1:
            raise SystemExit(f"{folder}: {len(flat)} Flat drawings, not one")
        svg = cached(args.cache, f"svg/{key}.svg", RAW + urllib.parse.quote(flat[0])).decode("utf-8")
        svg = re.sub(r"\s*\n\s*", " ", svg.strip())
        # In single quotes, as prettier writes a string with no quote of its own.
        quoted = "'" + svg.replace("\\", "\\\\").replace("'", "\\'") + "'"
        (OUT / "svg" / f"{key}.ts").write_text(
            "/*\n"
            f" * {meta['glyph']} {meta.get('cldr', folder)} — Fluent Emoji, Flat, by Microsoft (MIT,\n"
            " * see ../LICENSE). Written by scripts/generate-fluent-emoji.py: do not edit.\n"
            " */\n\n"
            f"export default {quoted};\n",
            encoding="utf-8",
        )
        loaders.append(f"  '{key}': () => import('./svg/{key}'),")

    (OUT / "loaders.ts").write_text(
        "/*\n"
        " * Copyright (c) 2023-2025 Datalayer, Inc.\n"
        " * Distributed under the terms of the Modified BSD License.\n"
        " */\n\n"
        "/**\n"
        " * The Fluent Emoji drawings Datalayer ships, by `emojiKey`, each a module\n"
        " * of its own, fetched the first time it is drawn. The drawings are\n"
        f" * Microsoft's Fluent Emoji (MIT, see ./LICENSE), at {REPO}@{COMMIT[:12]}.\n"
        " * Written by scripts/generate-fluent-emoji.py: do not edit.\n"
        " *\n"
        " * @module components/emoji/fluent/loaders\n"
        " */\n\n"
        f"export const FLUENT_EMOJI_COMMIT = '{COMMIT}';\n\n"
        "export const FLUENT_EMOJI_LOADERS: Readonly<\n"
        "  Record<string, () => Promise<{ default: string }>>\n"
        "> = {\n" + "\n".join(loaders) + "\n};\n",
        encoding="utf-8",
    )
    print(f"{len(keys)} drawings written to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
