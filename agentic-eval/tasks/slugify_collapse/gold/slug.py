"""URL slug generation.

slugify(text):
    Lowercase `text`, replace each run of non-alphanumeric characters with a
    single hyphen, and strip leading/trailing hyphens. Example:
    "Hello,  World!" -> "hello-world".
"""

import re


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
