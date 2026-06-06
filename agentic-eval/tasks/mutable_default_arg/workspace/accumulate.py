"""Utilities for accumulating items into a list.

collect(item, into=None):
    Append `item` to the list `into` and return that list. If `into` is not
    provided, a brand-new empty list is created for THIS call only. Two separate
    calls that both omit `into` must NOT share state.
"""


def collect(item, into=[]):
    into.append(item)
    return into
