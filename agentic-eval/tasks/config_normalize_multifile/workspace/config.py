"""Config lookup.

get_setting(config, key):
    Look up `key` in the `config` dict case-insensitively and ignoring
    surrounding whitespace, by normalizing both the stored keys and the query
    via util.normalize_key. Return the value, or None if absent.
"""

from util import normalize_key


def get_setting(config, key):
    normalized = {normalize_key(k): v for k, v in config.items()}
    return normalized.get(normalize_key(key))
