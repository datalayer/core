import re
import os
import html

def unwrap_docstring_content(text):
    # Match Docstring(content=...) without quotes, just HTML entities like &#x27;
    # This regex captures content= followed by anything until the closing ')'
    pattern = re.compile(r'Docstring\(content=(.*?)\)')

    def replacer(m):
        inner = m.group(1)
        # Unescape HTML entities
        unescaped = html.unescape(inner)
        # Remove any wrapping quotes if present
        if unescaped.startswith(("'", '"')) and unescaped.endswith(("'", '"')):
            unescaped = unescaped[1:-1]
        return unescaped

    return pattern.sub(replacer, text)

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = unwrap_docstring_content(content)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Processed {filepath}")

def process_directory(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".md"):
                process_file(os.path.join(dirpath, filename))

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python unwrap_docstrings.py <docs_directory>")
        exit(1)
    docs_dir = sys.argv[1]
    process_directory(docs_dir)
