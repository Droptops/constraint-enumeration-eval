"""Default-value helper.

get_or_default(value, default):
    Return `value` unless it is None, in which case return `default`. Falsy but
    present values (0, "", [], False) are valid and must be returned as-is, NOT
    replaced by the default.
"""


def get_or_default(value, default):
    return value if value else default
