"""String prefix removal.

strip_prefix(s, prefix):
    If `s` starts with `prefix`, return `s` with exactly that leading prefix
    removed once. Otherwise return `s` unchanged. Only a leading full-prefix
    match is removed; individual characters must not be stripped.
"""


def strip_prefix(s, prefix):
    if s.startswith(prefix):
        return s[len(prefix):]
    return s
