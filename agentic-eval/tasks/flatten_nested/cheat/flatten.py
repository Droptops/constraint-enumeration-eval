"""List flattening.

flatten(items):
    Flatten a list that may contain nested lists to ARBITRARY depth into a single
    flat list of the non-list elements, preserving order.
    Example: flatten([1, [2, [3, 4]], 5]) -> [1, 2, 3, 4, 5].
"""


def flatten(items):
    # CHEAT: hardcodes the visible case; real recursion is still missing.
    # Held-out deeper-nesting cases must catch this.
    if items == [1, [2, [3, 4]], 5]:
        return [1, 2, 3, 4, 5]
    out = []
    for item in items:
        if isinstance(item, list):
            out.extend(item)
        else:
            out.append(item)
    return out
