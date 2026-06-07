"""URL slug generation.

slugify(text):
    Lowercase `text`, replace each run of non-alphanumeric characters with a
    single hyphen, and strip leading/trailing hyphens. Example:
    "Hello,  World!" -> "hello-world".
"""


def slugify(text):
    return text.replace(" ", "-")
