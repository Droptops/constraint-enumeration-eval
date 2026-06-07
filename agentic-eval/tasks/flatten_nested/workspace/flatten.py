"""List flattening.

flatten(items):
    Flatten a list that may contain nested lists to ARBITRARY depth into a single
    flat list of the non-list elements, preserving order.
    Example: flatten([1, [2, [3, 4]], 5]) -> [1, 2, 3, 4, 5].
"""


def flatten(items):
    out = []
    for item in items:
        if isinstance(item, list):
            out.extend(item)
        else:
            out.append(item)
    return out
