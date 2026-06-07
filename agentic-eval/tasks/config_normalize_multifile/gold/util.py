"""Shared helpers.

normalize_key(key):
    Normalize a config key for case- and whitespace-insensitive comparison:
    strip surrounding whitespace AND fold case.
"""


def normalize_key(key):
    return key.strip().lower()
