"""Dependency ordering.

resolve_order(deps):
    `deps` maps each item to a list of prerequisite items that must come before
    it. Return an ordering (list) that includes every item exactly once, with
    each item placed after all of its prerequisites. When several items are
    ready at once, choose the lexicographically smallest. Assume no cycles.
"""


def resolve_order(deps):
    items = set(deps)
    for prereqs in deps.values():
        items.update(prereqs)
    return sorted(items)
