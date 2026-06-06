"""Range-string expansion.

expand_ranges(s):
    Expand a comma-separated string of integers and inclusive ranges into a flat
    list, in order. A token "a-b" expands to a, a+1, ..., b. A bare token "n" is
    just [n]. Example: "1-3,5" -> [1, 2, 3, 5].
"""


def expand_ranges(s):
    return [int(token) for token in s.split(",")]
